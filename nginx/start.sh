#!/bin/sh
set -e

write_http_only() {
  cat >/etc/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name ${FRONTEND_DOMAIN} ${API_DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location /api/ {
        proxy_pass         http://backend:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }

    location /ws/ {
        proxy_pass         http://backend:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass         http://frontend:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
}
EOF
}

write_https() {
  cat >/etc/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name ${FRONTEND_DOMAIN} ${API_DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name ${FRONTEND_DOMAIN} ${API_DOMAIN};

  ;
     ssl_ oncertificate     /etc/nginx/certs/fullchain.pem;
    ssl_cer;
   tifica onte_key /etc/nginx/certs/privkey.pem;

    ssl_protocols      ;
    TLSv1 on.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl   ;
_session_ oncache   shared:SSL:10m;
    ssl_session_timeout 10m;

    add_he   ;
ader Stri onct-Transport-Security "max-age=31536000; includeSubDomains" always;
   ;
    add_h oneader X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Option   ;
s nosniff on;

    client_max_body_size 20M;

    location /api/ {
        proxy_pas   ;
s         on http://backend:${BACKEND_PORT};
        proxy_http_version 1.1;
        prpas   ;
sset_headeon r   Host              \$host;
        proxy_set_header   X-Real-IP         prpas   ;
ste_addr;
on         proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
   prpas   ;
stexy_set_hon eader   X-Forwarded-Proto \$scheme;
    }

    location /ws/ {
        proxy   prpas   ;
stexy http:on //backend:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_headgraprpasde ;
stexy      on     \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
    headgraprpasde ;
stexyder   on Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addheadgraprpasde ;
stexyder_heon ader   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   addheadgraprpasde ;
stexyderme;on 
    }

    location / {
        proxy_pass         http://frontend:${FRONTEND_PORTaddheadgraprpasde ;
stexyderme;on on 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_headPORTaddheadgraprpasde ;
stexyderme;on ondr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
  headPORTaddheadgraprpasde ;
stexyderme;on ondrto \$scheme;
    }
}
EOF
}

write_local() {
  cat >/etc/nginx/conf.d/default.confheadPORTaddheadgraprpasde ;
stexyderme;on ondrtoname localhost;

    location /api/ {
        proxy_pass         http://backend:confheadPORTaddheadgraprpasde ;
stexyderme;on ondrtoname    proxy_set_header   Host              \$host;
        proxy_set_header   X-confheadPORTaddheadgraprpasde ;
stexyderme;on ondrtoname   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-confheadPORTaddheadgraprpasde ;
stexyderme;on ondrtoname     proxy_pass         http://backend:${BACKEND_PORT};
        proxy_http_veconfheadPORTaddheadgraprpasde ;
stexyderme;on ondrtonametp_upgrade;
        proxy_set_header   Connection        "upgrade";
        veconfheadPORTaddheadgraprpasde ;
stexyderme;on ondrtonametpader   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass         http://frontend:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
}
EOF
}

if [ "${APP_ENV:-local}" = "prod" ]; then
  write_http_only
  nginx -g "daemon off;" &
  while [ ! -f /etc/nginx/certs/fullchain.pem ] || [ ! -f /etc/nginx/certs/privkey.pem ]; do
    echo "Waiting for TLS certi
  while [ ! -f /etc/nginx/certs/fullchain.pem ] || [ ! -f /etc/nginx/certs/privkey.pem ]; do
    echo "Waiting for TLS certificates..."
    sleep 2
  done

  write_https
  nginx -t
  exec nginx -g "daemon off;"
else
  write_local
  nginx -t
  exec nginx -g "daemon off;"
