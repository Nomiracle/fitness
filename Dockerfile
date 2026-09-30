FROM python:3.11-slim
RUN pip install --no-cache-dir sqlalchemy pymysql bcrypt
COPY server/app.py /app/server/app.py
WORKDIR /app
ENV FITNESS_PORT=8971
EXPOSE 8971
CMD ["python3", "server/app.py"]
# 说明：v1.5 时代这里还有 COPY index.html /app/index.html（前端 HTML 打在镜像里）。
# 前端改为 Vue 静态产物后由 nginx 提供（见 deploy/），镜像只跑 API；
# 切换顺序与回滚见 deploy/README.md —— 先发布静态产物并切 vhost，再重建本镜像。
