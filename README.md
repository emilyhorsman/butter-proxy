# butter-proxy

```
$ butter-proxy
```

Uses `netstat` to automatically find running servers and then passes requests
to hosts matching the folder name of the server to the correct port.

For instance, a request to `resume.local` would be passed to port 3000 assuming
a process in `~/src/resume/` is listening on port 3000.
