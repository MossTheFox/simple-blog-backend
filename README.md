simple-blog-react 示例后端程序
-----

### 配置说明

这是一个示例后端程序，前端参见 [simple-blog-react](https://github.com/MossTheFox/simple-blog-react)。

前端的 vite 中有配置了反代理到此后端的端口，请留意。如果要部署，将打包好的前端塞进 ```/public``` 即可。

```sh
npm i       # 安装依赖
npx tsc     # 编译 TypeScript
node dist/app.js    # 启动
```

### License

MIT