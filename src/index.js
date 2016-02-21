#!/usr/bin/env node

import { exec, spawn } from 'child_process'
import { createServer } from 'http'
import { createProxyServer } from 'http-proxy'
import program from 'commander'
import expandTilde from 'expand-tilde'
import colors from 'colors/safe'

program
  .version('2.0.1')
  .description('Passes incoming requests to locally running development servers')
  .option('-t, --tld [tld]', 'Top-level domain, defaults to pxy', 'pxy')
  .option('-p, --port [port]', 'Port the proxy will bind to, defaults to 80', 80)
  .option('-b, --base [path]', 'Only proxy to processes from this directory, defaults to ~/src', '~/src')
program.parse(process.argv)

let state = {}

function log(string, color) {
  console.log(colors[color](`[${new Date().toISOString()}] ${string}`))
}

const printChange = (current, next) => {
  for (const key of Object.keys(next)) {
    if (!current.hasOwnProperty(key)) {
      log(`${key}.${program.tld} on ${next[key]}`, 'green')
    }
  }

  for (const key of Object.keys(current)) {
    if (!next.hasOwnProperty(key)) {
      log(`${key} no longer listening on ${current[key]}`, 'red')
    }
  }
}

function checkExecutable(resolve, opts, port, program, err, stdout, stderr) {
  const [ pid, path ] = stdout.trim().split(/\:\s+/)

  const base = expandTilde(opts.base)
  if (!path.startsWith(base)) {
    return resolve({})
  }

  const host = path
    .substr(base.length)  // Remove the base dir as it isn't part of the host
    .split('/')
    .filter((s) => s)     // Handle lack of trailing slash (remove blanks)
    .reverse()            // Server in ~/src/foo/www should be www.foo.tld
    .join('.')

  const ret = {}
  ret[host] = port
  return resolve(ret)
}

function somethingListeningOn(localAddr, program, opts) {
  const [ addr, port ] = localAddr.split(/\:+/)
  const [ pid, name ]  = program.split('/')

  if (opts.port === port) {
    return
  }

  return new Promise((resolve, reject) => {
    exec(`pwdx ${pid}`, checkExecutable.bind(null, resolve, opts, port, program))
  })
}

const NETSTAT_COLUMNS = {
  proto: 0,
  localAddr: 3,
  program: 6
}

/*
 * c: refresh every second
 * l: only listening sockets
 * n: numeric ports instead of 'http'
 * t: TCP only
 * p: show PID and program
 */
const netstat = spawn('netstat', ['-ctlpn'])
netstat.stdout.setEncoding('utf8')

netstat.stdout.on('data', (data) => {
  const lines = data.toString().split("\n")
  let promises = []

  for (const line of lines) {
    const cols = line.trim().split(/\s+/)

    if (cols.length !== 7) {
      continue
    }

    if (!cols[NETSTAT_COLUMNS.proto].startsWith('tcp')) {
      continue
    }

    if (cols[NETSTAT_COLUMNS.program] === '-') {
      continue
    }

    promises.push(somethingListeningOn(
      cols[NETSTAT_COLUMNS.localAddr],
      cols[NETSTAT_COLUMNS.program],
      program
    ))
  }

  Promise.all(promises).then(function(servers) {
    const nextState = Object.assign({}, ...servers)
    printChange(state, nextState)
    state = nextState
  })
})

/*
 * The TLD is used for disambiguation purposes, but it can be left off. This
 * function will return false if the key is not a valid host.
 *
 * Let's say the base directory is `~`. A server is running in `~/src/foo/bar`.
 * If a request comes to `bar.foo.src`, it should work. If a request comes to
 * `bar.foo.src.pxy`, it should work, because the TLD is .local. If a request
 * comes to `bar.foo.src.xyz`, it should not work, since the TLD is not `xyz`
 * and since there is no server running in `~/src/foo/bar/xyz`
 */
const getTarget = (host) => {
  const i = host.indexOf('.' + program.tld)
  const key = (i === -1) ? host : host.slice(0, i)

  if (!state.hasOwnProperty(key)) {
    return false
  }

  return `http://localhost:${state[key]}`
}

const binding = program.port
const proxy = createProxyServer()

proxy.on('proxyRes', function(proxyRes, req, res) {
  log(`${proxyRes.statusCode} from ${req.headers['host']}${req.url}`, 'magenta')
})

createServer(function(req, res) {
  const host = req.headers['host']
  const target = getTarget(host)
  log(`${req.method} ${req.url} to ${host}`, 'magenta')

  if (!target) {
    res.writeHead(400)
    return res.end()
  }

  proxy.web(req, res, {
    target: target
  })
}).listen(binding)

log(`Listening on ${binding}`, 'magenta')
