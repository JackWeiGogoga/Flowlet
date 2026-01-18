# VSCode 多项目开发环境配置指南

## 项目结构

本项目包含多个子项目，使用不同的技术栈：

```
Flowlet/
├── flowlet-backend/          # ☕ Java (Spring Boot)
├── flowlet-frontend/         # ⚛️  React + TypeScript
├── flowlet-code-executor/    # 🐍 Python (独立虚拟环境)
├── news-group-service/       # 🐍 Python (独立虚拟环境)
├── mock-service/             # 🐍 Python (独立虚拟环境)
└── Flowlet.code-workspace    # VSCode Workspace 配置
```

## 快速开始

### 1. 初始化 Python 虚拟环境

```bash
# 赋予执行权限
chmod +x setup-python-envs.sh

# 运行初始化脚本
./setup-python-envs.sh
```

这会为每个 Python 子项目创建独立的 `.venv` 虚拟环境。

### 2. 打开 VSCode Workspace

**方式一：通过 VSCode 菜单**
1. 打开 VSCode
2. `File` -> `Open Workspace from File...`
3. 选择 `Flowlet.code-workspace`

**方式二：通过命令行**
```bash
code Flowlet.code-workspace
```

### 3. 选择 Python 解释器

VSCode 会自动识别每个子项目的虚拟环境。如需手动选择：

1. 打开任意 Python 文件
2. 按 `Cmd+Shift+P` (macOS) 或 `Ctrl+Shift+P` (Windows/Linux)
3. 输入并选择 `Python: Select Interpreter`
4. 选择对应项目的 `.venv/bin/python`

## 工作原理

### Workspace 配置

`Flowlet.code-workspace` 定义了：
- **多个文件夹**: 每个子项目作为独立的文件夹
- **全局设置**: 适用于所有子项目的通用配置
- **推荐扩展**: Java、Python、TypeScript 等相关插件

### 子项目 Python 配置

每个 Python 子项目有独立的 `.vscode/settings.json`：

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "python.terminal.activateEnvironment": true,
  "python.analysis.extraPaths": ["${workspaceFolder}"]
}
```

关键点：
- `${workspaceFolder}` 指向**当前子项目**的根目录
- 每个子项目使用自己的 `.venv` 虚拟环境
- 互不干扰，依赖版本独立管理

## 开发工作流

### Python 项目

```bash
# 进入具体项目目录
cd flowlet-code-executor

# 激活虚拟环境
source .venv/bin/activate

# 安装新依赖
pip install <package>

# 更新 requirements.txt
pip freeze > requirements.txt

# 退出虚拟环境
deactivate
```

### Java 项目

```bash
cd flowlet-backend

# Maven 编译
mvn clean install

# 运行
mvn spring-boot:run
```

### 前端项目

```bash
cd flowlet-frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## VSCode 侧边栏视图

使用 Workspace 后，侧边栏会显示多个文件夹：

```
EXPLORER
├── 🌊 Flowlet (Root)
├── ☕ Backend (Java)
├── ⚛️ Frontend (React)
├── 🐍 Code Executor (Python)
├── 🐍 News Group Service (Python)
└── 🐍 Mock Service (Python)
```

可以快速在不同项目间切换，且每个项目保持独立的环境配置。

## 终端使用

### 方式一：使用 VSCode 集成终端

1. 打开终端: `Cmd+\`` 或 `Ctrl+\``
2. 点击终端右上角的 `+` 旁边的下拉箭头
3. 选择对应的项目文件夹
4. 虚拟环境会自动激活

### 方式二：Split 终端

可以同时为不同项目开启多个终端窗口：

```
Terminal 1: flowlet-backend  (Java)
Terminal 2: flowlet-frontend (npm dev)
Terminal 3: news-group-service (Python .venv)
```

## 常见问题

### Q1: Python 导入模块报错

**问题**: `ModuleNotFoundError` 或红色波浪线

**解决**:
1. 确保选择了正确的 Python 解释器
2. 检查虚拟环境是否正确安装依赖
3. 重启 Pylance 语言服务: `Cmd+Shift+P` -> `Python: Restart Language Server`

### Q2: 多个 Python 项目依赖冲突

**方案**: 已通过独立虚拟环境解决，每个项目的依赖互不影响。

### Q3: 如何更新某个项目的虚拟环境

```bash
cd <project-dir>
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

或重新运行 `./setup-python-envs.sh`

### Q4: Java 项目找不到依赖

确保安装了 VSCode Java 扩展包：
- Extension Pack for Java
- Spring Boot Extension Pack

首次打开可能需要等待 Maven 下载依赖。

## 推荐扩展

Workspace 已配置推荐扩展列表，打开 Workspace 时 VSCode 会提示安装：

**Java**:
- Extension Pack for Java
- Spring Boot Dashboard

**Python**:
- Python
- Pylance
- Black Formatter

**前端**:
- ESLint
- Prettier

**通用**:
- EditorConfig
- Docker

## 最佳实践

1. **始终通过 Workspace 打开项目**: 确保配置生效
2. **每个项目独立管理依赖**: 不共享虚拟环境
3. **使用 `.gitignore` 排除虚拟环境**: `.venv/` 已被忽略
4. **定期同步 requirements.txt**: 便于团队协作
5. **利用 VSCode 多终端**: 同时运行多个服务

## 项目启动顺序

完整开发环境启动：

```bash
# Terminal 1: Backend
cd flowlet-backend
mvn spring-boot:run

# Terminal 2: Frontend  
cd flowlet-frontend
npm run dev

# Terminal 3: Code Executor (if needed)
cd flowlet-code-executor
source .venv/bin/activate
python app.py

# Terminal 4: News Group Service (if needed)
cd news-group-service
source .venv/bin/activate
python -m app.main
```

或使用 Docker Compose 管理服务。

## 更多资源

- [VSCode Workspace 文档](https://code.visualstudio.com/docs/editor/workspaces)
- [Python 虚拟环境指南](https://docs.python.org/3/tutorial/venv.html)
- [VSCode 多根工作区配置](https://code.visualstudio.com/docs/editor/multi-root-workspaces)
