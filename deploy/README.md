# 部署（fitness）

切换前：`location /` **整体反代**到容器 `fitness`（127.0.0.1:8971），前端 HTML 打在镜像里
（`COPY index.html /app/index.html`），改一次前端就要重建镜像 + 重建容器。

切换后（方案 A）：`/` 由 nginx 静态目录提供 Vue 产物，只有 `/api/` 进容器。改前端 = `bash deploy/build-web.sh`，
不需要重建镜像、不需要 reload（静态文件更新不需要 reload nginx）。

## 顺序（每一步都可独立验证/回滚）

1. **发布静态产物**：`bash deploy/build-web.sh`
   产物落到 `/root/transfer/nginx/html/fitness/`（容器内 `/usr/share/nginx/html/fitness`）。
   这一步不影响线上（旧 vhost 仍在全量反代）。
2. **切换 vhost**：把 `deploy/nginx-fit.conf` 里的 `fit.example.com` 换成真实域名，安装到
   `/root/transfer/nginx/conf.d/`，然后 `docker exec nginx nginx -t && docker exec nginx nginx -s reload`。
3. **线上验收**（见下），失败即执行回滚。
4. **清理 API 镜像里的旧前端**：`Dockerfile` 已去掉 `COPY index.html`，重建 `fitness-bulk:<新版本>` 后重建容器时
   **必须原样带回原启动参数**（`--env-file` 只有数据库口令，绑定地址/端口要另用 `-e` 给）：

   ```bash
   docker run -d --name fitness --restart unless-stopped \
     --env-file <数据库口令 env 文件> \
     -e FITNESS_BIND=0.0.0.0 -e FITNESS_PORT=8971 \
     -p 127.0.0.1:8971:8971 fitness-bulk:<新版本>
   ```

   重建前先核对当前容器的 `HostConfig.PortBindings` / `Env` / `RestartPolicy`，并保留旧镜像 tag 作回滚点。
   注意：`server/app.py` 仍会把 `GET /` 当作静态 HTML 返回；`index.html` 已不在仓库里，该路径对容器而言会是 404 ——
   切到方案 A 后 `/` 不再进容器，这属于预期。

## 线上验收

```bash
curl -sI https://<域名>/ | grep -Ei 'cache-control|content-security-policy|x-content-type'
curl -sI https://<域名>/index.html | grep -Ei 'cache-control'
curl -sI "https://<域名>/assets/<hash>.js" | grep -Ei 'cache-control|immutable|content-security-policy'
curl -s -o /dev/null -w '%{http_code}\n' https://<域名>/train        # 深链 → 200 HTML
curl -s -o /dev/null -w '%{http_code}\n' https://<域名>/api/me       # 未登录 → 401
```

浏览器里再确认：登录 → 今日/训练/饮食/体重/计划 五页可切换、训练保存后历史出现记录、体重曲线渲染、
控制台 0 报错、未登录刷新落在 `/login`。

## 回滚

把 vhost 换回旧版（upstream + `location / { proxy_pass http://fitness_backend; }`）并 reload —— 旧前端仍在镜像里，立即恢复。
静态目录可以留着不动。
