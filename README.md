**Slackwell - a 2way slack bot**

Slackwell lets your slack team send commands and check for status updates
on your servers. This is an interesting alternative to developing an command
and control interface for your services/servers/saas. The added bonus is
that it uses a tool your team probably already does, and it logs what has
been done for all your team to see (and it searchable, cool).

Slackwell is a starter project, it has all the parts you will need to get started.

Slackwell is a tiny web server and runs on an IP and port.

I recommend using an internal ip and using a solution like NGINX to map the
web hook (i.e. https://www.yourdomain.com/slackwell ) to the application. I would
also recommend you use SSL and only map the webhook end point to SSL connections.
Good news is slack will call ssl webhook endpoints.

In NGINX you can add the following to your servers block for port 443 (SSL) or
if you have to port 80 (normal web) (somewhere in your /nginx/sites-enabled folder)

    location /slackwell {
         proxy_pass http://slackwell;
         proxy_redirect http:// https://;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto https;
    }

You will also need an upstream, you add this somewhere near the top of that same
file, this is the internal server that NGINX will route the request to:

    upstream slackwell {
            server <ip>:<port>;
    }

*note: remember to replace the ip and port with the ones you passed to slackwell*

 I recommend using something
like NGINX setting up a mapping /slackwell to the IP and port you've provided.
