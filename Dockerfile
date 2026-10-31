# ===================================================================
# Lumin Consultancy - Production Dockerfile (PHP 8.2 + Apache)
# ===================================================================
FROM php:8.2-apache

# Install PDO MySQL extension for MySQL database access
RUN docker-php-ext-install pdo pdo_mysql

# Enable Apache rewrite and headers modules for .htaccess routing & security
RUN a2enmod rewrite headers

# Configure Apache DocumentRoot and .htaccess overrides
RUN { \
    echo '<Directory /var/www/html>'; \
    echo '    Options -Indexes +FollowSymLinks'; \
    echo '    AllowOverride All'; \
    echo '    Require all granted'; \
    echo '</Directory>'; \
} > /etc/apache2/conf-available/lumin.conf \
    && a2enconf lumin

# Configure Apache to listen on dynamic ${PORT} (compatible with Railway, Cloud Run, Heroku & local)
RUN sed -i 's/Listen 80/Listen ${PORT}/g' /etc/apache2/ports.conf \
    && sed -i 's/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/g' /etc/apache2/sites-available/000-default.conf

# Set working directory
WORKDIR /var/www/html

# Copy application files into web root
COPY . /var/www/html/

# Clean up build/package artifacts from image layer
RUN rm -rf /var/www/html/dist /var/www/html/.git /var/www/html/.vscode

# Set permissions for Apache user
RUN chown -R www-data:www-data /var/www/html

# Default port fallback
ENV PORT=8080
EXPOSE 8080

CMD ["apache2-foreground"]

