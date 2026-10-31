# ===================================================================
# Lumin Consultancy - Production Dockerfile (PHP 8.2 + Apache)
# Supports MySQL & PostgreSQL, with dynamic PORT for Cloud (Render, Railway, etc.)
# ===================================================================
FROM php:8.2-apache

# Install PostgreSQL client development libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PDO MySQL, PDO PostgreSQL, and PostgreSQL PHP extensions
RUN docker-php-ext-install pdo pdo_mysql pdo_pgsql pgsql

# Enable Apache rewrite and headers modules for .htaccess routing & security
RUN a2enmod rewrite headers

# Suppress ServerName domain name warnings
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Configure Apache DocumentRoot and .htaccess overrides
RUN { \
    echo '<Directory /var/www/html>'; \
    echo '    Options -Indexes +FollowSymLinks'; \
    echo '    AllowOverride All'; \
    echo '    Require all granted'; \
    echo '</Directory>'; \
} > /etc/apache2/conf-available/lumin.conf \
    && a2enconf lumin

# Set working directory
WORKDIR /var/www/html

# Copy application files into web root
COPY . /var/www/html/

# Clean up build/package artifacts from image layer
RUN rm -rf /var/www/html/dist /var/www/html/.git /var/www/html/.vscode

# Set permissions for Apache user
RUN chown -R www-data:www-data /var/www/html

# Copy entrypoint script with dynamic port handling
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose default port (Render will use PORT environment variable, defaults to 8080)
ENV PORT=8080
EXPOSE 8080 10000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]
