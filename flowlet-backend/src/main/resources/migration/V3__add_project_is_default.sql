-- 为 project 表添加 is_default 字段
ALTER TABLE project ADD COLUMN is_default BOOLEAN DEFAULT FALSE;

-- 为现有的默认项目设置 is_default = true（假设名为"默认项目"的是默认项目）
UPDATE project SET is_default = TRUE WHERE name = '默认项目';
