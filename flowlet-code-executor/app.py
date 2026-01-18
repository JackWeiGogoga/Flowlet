from __future__ import annotations

import json
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field
import subprocess

app = FastAPI(title="Flowlet Code Executor", version="0.1.0")


class ExecuteRequest(BaseModel):
    language: str = Field(default="python")
    code: str
    inputs: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)
    timeoutMs: Optional[int] = None
    memoryMb: Optional[int] = None
    allowNetwork: Optional[bool] = False


class ExecuteResponse(BaseModel):
    success: bool
    output: Optional[Any] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    durationMs: Optional[int] = None
    errorMessage: Optional[str] = None


RUNNER_TEMPLATE = """
import json
import os
import sys
import time
import traceback

# Best-effort resource limits (Linux only)
try:
    import resource  # type: ignore
except Exception:
    resource = None

def _apply_limits(memory_mb: int | None) -> None:
    if resource is None or memory_mb is None:
        return
    limit_bytes = int(memory_mb) * 1024 * 1024
    try:
        resource.setrlimit(resource.RLIMIT_AS, (limit_bytes, limit_bytes))
    except Exception:
        pass
    try:
        resource.setrlimit(resource.RLIMIT_DATA, (limit_bytes, limit_bytes))
    except Exception:
        pass

def _disable_network() -> None:
    try:
        import socket
    except Exception:
        return

    class _BlockedSocket(socket.socket):  # type: ignore
        def __init__(self, *args, **kwargs):
            raise RuntimeError("Network access is disabled")

    socket.socket = _BlockedSocket  # type: ignore


def main() -> int:
    payload = json.load(sys.stdin)
    allow_network = payload.get("allowNetwork", False)
    memory_mb = payload.get("memoryMb")
    _apply_limits(memory_mb)
    if not allow_network:
        _disable_network()

    user_path = os.environ.get("FLOWLET_USER_CODE")
    result_path = os.environ.get("FLOWLET_RESULT_PATH")
    if not user_path or not result_path:
        print("missing env", file=sys.stderr)
        return 2

    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("user_code", user_path)
        if spec is None or spec.loader is None:
            raise RuntimeError("failed to load user code")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        if not hasattr(module, "run"):
            raise RuntimeError("run(inputs, context) is required")

        start = time.time()
        output = module.run(payload.get("inputs", {}), payload.get("context", {}))
        duration_ms = int((time.time() - start) * 1000)

        result = {
            "success": True,
            "output": output,
            "durationMs": duration_ms,
        }
        with open(result_path, "w", encoding="utf-8") as f:
            json.dump(result, f)
        return 0
    except Exception:
        error = traceback.format_exc()
        with open(result_path, "w", encoding="utf-8") as f:
            json.dump({"success": False, "errorMessage": error}, f)
        return 1


if __name__ == "__main__":
    sys.exit(main())
"""


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/execute", response_model=ExecuteResponse)
def execute(req: ExecuteRequest) -> ExecuteResponse:
    if req.language.lower() != "python":
        return ExecuteResponse(success=False, errorMessage="only python is supported")

    start_time = time.time()
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        user_path = tmp_path / "user_code.py"
        runner_path = tmp_path / "runner.py"
        result_path = tmp_path / "result.json"

        user_path.write_text(req.code, encoding="utf-8")
        runner_path.write_text(RUNNER_TEMPLATE, encoding="utf-8")

        payload = {
            "inputs": req.inputs,
            "context": req.context,
            "allowNetwork": bool(req.allowNetwork),
            "memoryMb": req.memoryMb,
        }

        timeout_sec = max(0.1, (req.timeoutMs or 3000) / 1000.0)
        env = os.environ.copy()
        env["FLOWLET_USER_CODE"] = str(user_path)
        env["FLOWLET_RESULT_PATH"] = str(result_path)

        try:
            completed = subprocess.run(
                ["python", str(runner_path)],
                input=json.dumps(payload),
                text=True,
                capture_output=True,
                timeout=timeout_sec,
                env=env,
            )
        except subprocess.TimeoutExpired:
            duration_ms = int((time.time() - start_time) * 1000)
            return ExecuteResponse(
                success=False,
                stdout="",
                stderr="timeout",
                durationMs=duration_ms,
                errorMessage="execution timeout",
            )

        duration_ms = int((time.time() - start_time) * 1000)
        stdout = completed.stdout or ""
        stderr = completed.stderr or ""

        if not result_path.exists():
            return ExecuteResponse(
                success=False,
                stdout=stdout,
                stderr=stderr,
                durationMs=duration_ms,
                errorMessage="no result produced",
            )

        result_data = json.loads(result_path.read_text(encoding="utf-8"))
        if not result_data.get("success"):
            return ExecuteResponse(
                success=False,
                stdout=stdout,
                stderr=stderr,
                durationMs=duration_ms,
                errorMessage=result_data.get("errorMessage") or "execution failed",
            )

        return ExecuteResponse(
            success=True,
            output=result_data.get("output") or {},
            stdout=stdout,
            stderr=stderr,
            durationMs=result_data.get("durationMs") or duration_ms,
        )
