FROM php:8.3-fpm
RUN apt-get update && apt-get install -y git zip unzip libpq-dev
RUN docker-php-ext-install pdo pdo_pgsql
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public"]
