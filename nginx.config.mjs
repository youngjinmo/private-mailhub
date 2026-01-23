# Nginx configuration for Private MailHub
# Save this as: /etc/nginx/sites-available/private-mailhub

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream backend
upstream backend {
    least_conn;
    server 127.0.0.1:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP server (redirect to HTTPS after SSL setup)
server {
    listen 80;
    listen [::]:80;
    server_name private-mailhub.com www.private-mailhub.com;

    # For Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Uncomment after SSL setup to redirect HTTP to HTTPS
    # location / {
    #     return 301 https://$server_name$request_uri;
    # }

    # Root and index for frontend (comment out after SSL setup)
    root /var/www/private-mailhub/front-end/dist;
    index index.html;

    # Frontend static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend
    location /api {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://backend;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;

        # Error handling
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}

# HTTPS server (uncomment after SSL certificate is obtained)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name private-mailhub.com www.private-mailhub.com;
#
#     # SSL certificates
#     ssl_certificate /etc/letsencrypt/live/private-mailhub.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/private-mailhub.com/privkey.pem;
#
#     # SSL configuration (Mozilla Intermediate)
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
#     ssl_prefer_server_ciphers off;
#     ssl_session_cache shared:SSL:10m;
#     ssl_session_timeout 10m;
#     ssl_stapling on;
#     ssl_stapling_verify on;
#
#     # Root and index for frontend
#     root /var/www/private-mailhub/front-end/dist;
#     index index.html;
#
#     # Frontend static files
#     location / {
#         try_files $uri $uri/ /index.html;
#         add_header Cache-Control "public, max-age=31536000, immutable";
#     }
#
#     # Special handling for index.html (no cache)
#     location = /index.html {
#         add_header Cache-Control "no-cache, no-store, must-revalidate";
#         add_header Pragma "no-cache";
#         add_header Expires "0";
#     }
#
#     # API proxy to backend
#     location /api {
#         limit_req zone=api_limit burst=20 nodelay;
#
#         proxy_pass http://backend;
#         proxy_http_version 1.1;
#
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_set_header Connection "";
#
#         # Timeouts
#         proxy_connect_timeout 60s;
#         proxy_send_timeout 60s;
#         proxy_read_timeout 60s;
#
#         # Buffer settings
#         proxy_buffering on;
#         proxy_buffer_size 4k;
#         proxy_buffers 8 4k;
#
#         # Error handling
#         proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
#     }
#
#     # Gzip compression
#     gzip on;
#     gzip_vary on;
#     gzip_min_length 1024;
#     gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
#
#     # Security headers
#     add_header X-Frame-Options "SAMEORIGIN" always;
#     add_header X-Content-Type-Options "nosniff" always;
#     add_header X-XSS-Protection "1; mode=block" always;
#     add_header Referrer-Policy "strict-origin-when-cross-origin" always;
#     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
# }

