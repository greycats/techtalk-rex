# encoding: utf-8

center <<-EOS
  \e[1mBuild Snapshot Service from Scratch\e[0m


  Rex Sheng

  InteractiveLabs 2017
EOS

section "React app as a console" do

  block <<-EOS
    * boilerplate: create-react-app

    * form, spinner, state
  EOS

  code <<-EOS
    \e[0;32m~\e[0m create-react-app tt-628
    \e[0;32m~\e[0m yarn add react-bootstrap superagent react-spinkit
    \e[0;32m~\e[0m yarn start
  EOS

  code <<-EOS
  ├─ public
  │
  │   ├── favicon.ico
  │   ├── index.html
  │   └── manifest.json
  ├─ src
  │
  │   ├── App.css
  │   ├── App.js
  │   └── ..
  │
  └─ package.json
  EOS

  code <<-EOS, :javascript
    \e[0;37m/* src/Form.js */\e[0m

    class Form extends Component {
      props: {
        input: Node,
        onSubmit: Function
      }

      handleSubmit(e) {
        e.preventDefault()
        this.props.onSubmit(this.input.value)
      }
      ...
    }
  EOS

  code <<-EOS, :javascript
    \e[0;37m/* src/App.js */\e[0m

    render() {
      ...
      <Form onSubmit={this.performSearch.bind(this)} />
      ...
    }

    async performSearch(keyword: string) {
      this.setState({ loading: true, error: undefined })
      try {
        await request.post(\e[0;32m'/api/search'\e[0m).send({ \e[0;33mkeyword\e[0m })
      } catch(error) {
        this.setState({ error: error.message })
      }
      this.setState({ loading: false })
    }
  EOS

end

section "Koa2 API Server" do

  code <<-EOS
  ├─ api
  │
  │   ├── routers
  │   │
  │   │   ├── index.js
  │   │   └── search.js
  │   │
  │   ├── index.js
  │   └── server.js
  ...
  EOS

  code <<-EOS, :json
    \e[0;37m/* package.json */\e[0m

    {
      "proxy": "http://localhost:3001"
    }
  EOS

  code <<-EOS
    \e[0;32m~\e[0m yarn add koa koa-body koa-router
    \e[0;32m~\e[0m yarn add babel-preset-es2015 -D
    \e[0;32m~\e[0m yarn add babel-preset-stage-0 -D
  EOS

  code <<-EOS, :javascript
  \e[0;37m/* routers/search.js */\e[0m

  export default () =>
    new Router()
    .post('/', async ctx => {
      const { \e[0;33mkeyword\e[0m } = ctx.request.body
      ctx.body = { done: true, \e[0;33mkeyword\e[0m }
    })
    .routes()

  \e[0;37m/* routers/index.js */\e[0m

  export default new Router({ prefix: '/api' })
  .use('/search', search())
  EOS

  code <<-EOS, :javascript
  \e[0;37m/* api/server.js */\e[0m

  import Koa from 'koa'
  import body from 'koa-body'
  import router from './routers'

  export default () => {
    const app = new Koa()
    app.name = 'API'
    app.use(body())
    app.use(router.routes())
    return app
  }
  EOS

  code <<-EOS, :javascript
  \e[0;37m/* api/index.js */\e[0m

  import Server from './server'

  Server().listen(3001)

  EOS

  code <<-EOS
    \e[0;32m~\e[0m nodemon api
  EOS

end

section "Get snapshot using PhantomJS" do

  block <<-EOS
    * a script executed by phantomjs process

    * a promise to wait on the result of the script

    * return the image
  EOS

  code <<-EOS, :javascript
  \e[0;37m/* phantom/phantom-screenshot.js */\e[0m

  var page = require('webpage').create();
    address = ...;
    output = ...;
  page.open(\e[0;32maddress\e[0m, function(status) {
    if (status !== 'success') {
      console.log('Unable to load the address!');
      phantom.exit(1);
    } else {
      window.setTimeout(function() {
        page.render(\e[0;32moutput\e[0m);
        phantom.exit();
      }, 200);
    }
  })
  EOS

  code <<-EOS, :javascript
  \e[0;37m/* phantom/index.js */\e[0m

  new Promise((resolve, reject) => {
    const path = ...
    const script = `${__dirname}/phantom-screenshot.js`
    const program = \e[0;32mphantomjs.exec\e[0m(script, url, path, ...)
    program.on('exit', code => {
      if (!code) {
        return resolve(path)
      } else {
        reject(code)
      }
    })
  })
  EOS

  code <<-EOS, :javascript
  type Options = {
    url: string,
    postfix: string,
    size: number,
    scale: number
  }

  function screenshot(options: Options): Promise<string>
  EOS

  code <<-EOS, :javascript
  \e[0;37m/* api/routers/search.js */\e[0m

  const path = await screenshot({
    url: `.../search?q=${encodeURIComponent(keyword)}`,
    postfix: '.jpg',
    size: 1366,
    scale: 3
  })
  ...
  ctx.body = fs.createReadStream(path)
  ctx.type = 'image/jpeg'
  ctx.set('content-disposition', 'inline')
  EOS

  center <<-EOS
    check out!
  EOS

end

section "Work in background" do

  block <<-EOS
  * Redis
    - database
    - cache
    - \e[0;33mmessage broker\e[0m

  * Bull (we used to use \e[1mKue\e[0m in the secret app)
    - persistent job and message queue based on Redis

  * Arena
    - monitoring UI
  EOS

  code <<-EOS
  \e[0;32m~\e[0m brew install redis
  \e[0;32m~\e[0m brew services start redis
  \e[0;32m~\e[0m yarn add bull
  EOS

  code <<-EOS, :javascript
  \e[0;37m/* phantom/index.js */\e[0m

  import Queue from 'bull'

  const queue = new Queue('screenshot')
  const completionQueue = new Queue('screenshot-complete')

  queue.process(job =>
    screenshot(job.data)
    .then(path =>
      completionQueue.add({job_id: job.id, path})
    )
  )
  EOS

  code <<-EOS, :javascript
  \e[0;37m/* api/routers/search.js */\e[0m

  const handlers = {}

  completionQueue.process((job, done) => {
    const { job_id, path } = job.data
    if (handlers[job_id]) {
      handlers[job_id](path)
      delete handlers[job_id]
    }
    done()
  })
  EOS

  code <<-EOS
    \e[0;32m~\e[0m nodemon phantom
  EOS

  code <<-EOS
    \e[0;32m~\e[0m open http://localhost:4567/dashboard
  EOS

  code <<-EOS
    \e[0;32m~\e[0m pm2 start ecosystem.yml
  EOS

end

__END__

section "References" do
  block <<-EOS
    * https://react-bootstrap.github.io
    * https://github.com/fxn/tkn
    * https://github.com/facebookincubator/create-react-app
    * https://github.com/OptimalBits/bull

  EOS
end
