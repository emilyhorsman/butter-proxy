import expandTilde from 'expand-tilde'
import { exec, spawn } from 'child_process'

function checkExecutable(resolve, port, program, err, stdout, stderr) {
  const [ pid, path ] = stdout.trim().split(/\:\s+/)

  const base = expandTilde(process.env.BUTTER_PROXY_BASE_DIR || '~/src/')
  if (!path.startsWith(base)) {
    return resolve({})
  }

  const folder = path.substr(base.length).split('/')[0]
  const ret = {}
  ret[folder] = port
  return resolve(ret)
}

const somethingListeningOn = (localAddr, program) => {
  const [ addr, port ] = localAddr.split(/\:+/)
  const [ pid, name ]  = program.split('/')

  return new Promise((resolve, reject) => {
    exec(`pwdx ${pid}`, checkExecutable.bind(null, resolve, port, program))
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
      cols[NETSTAT_COLUMNS.program]
    ))
  }

  Promise.all(promises).then(function(servers) {
    const nextState = Object.assign({}, ...servers)
  })
})
