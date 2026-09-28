FROM python:3.11-slim
RUN pip install --no-cache-dir sqlalchemy pymysql bcrypt
COPY index.html /app/index.html
COPY server/app.py /app/server/app.py
WORKDIR /app
ENV FITNESS_PORT=8971
EXPOSE 8971
CMD ["python3", "server/app.py"]
