FROM php:8.3-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git zip unzip libpq-dev libpng-dev libjpeg-dev libfreetype6-dev \
    libzip-dev libonig-dev && \
    docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install pdo pdo_pgsql pgsql mbstring zip gd bcmath

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy composer files first for caching
COPY composer.json ./

# Install dependencies
RUN composer install --no-scripts --no-autoloader --prefer-dist 2>/dev/null || true

# Copy the rest of the application
COPY . .

# Complete composer install
RUN composer install --prefer-dist && \
    php artisan package:discover --ansi 2>/dev/null || true

# Set permissions
RUN chmod -R 775 storage bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
