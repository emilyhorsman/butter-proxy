import expandTilde from 'expand-tilde'
import { exec, spawn } from 'child_process'

const checkExecutable = (port, program, err, stdout, stderr) => {
  const [ pid, path ] = stdout.trim().split(/\:\s+/)

  if (!path.startsWith(expandTilde('~/src/'))) {
    return
  }

  console.log(`${path} (${pid}/${program}) running on ${port}`)
}

const somethingListeningOn = (localAddr, program) => {
  const [ addr, port ] = localAddr.split(/\:+/)
  const [ pid, name ]  = program.split('/')

  exec(`pwdx ${pid}`, checkExecutable.bind(this, port, program))
}

const netstatColumns = {
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
  for (const line of lines) {
    const cols = line.trim().split(/\s+/)

    if (cols.length !== 7) {
      continue
    }

    if (!cols[netstatColumns.proto].startsWith('tcp')) {
      continue
    }

    if (cols[netstatColumns.program] === '-') {
      continue
    }

    somethingListeningOn(cols[netstatColumns.localAddr], cols[netstatColumns.program])
  }
})
