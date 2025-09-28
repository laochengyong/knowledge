# 先开代理
git config --global http.proxy http://127.0.0.1:17890
git push origin master
git config --global --unset http.proxy
