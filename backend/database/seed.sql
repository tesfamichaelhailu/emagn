-- Emagn Platform Seed Data
USE emagn_platform;

-- Insert default categories
INSERT INTO categories (name, description, image_url) VALUES
('Electronics', 'Electronic devices and accessories', '/images/categories/electronics.jpg'),
('Clothing & Fashion', 'Apparel, shoes, and fashion accessories', '/images/categories/fashion.jpg'),
('Home & Garden', 'Home improvement and garden supplies', '/images/categories/home.jpg'),
('Sports & Outdoors', 'Sports equipment and outdoor gear', '/images/categories/sports.jpg'),
('Books & Media', 'Books, movies, music, and games', '/images/categories/books.jpg'),
('Health & Beauty', 'Health products and beauty items', '/images/categories/health.jpg'),
('Automotive', 'Car parts and automotive accessories', '/images/categories/automotive.jpg'),
('Toys & Games', 'Toys, games, and children items', '/images/categories/toys.jpg');

-- Insert subcategories
INSERT INTO categories (name, description, parent_id, image_url) VALUES
-- Electronics subcategories
('Smartphones', 'Mobile phones and accessories', 1, '/images/categories/smartphones.jpg'),
('Laptops', 'Laptop computers and accessories', 1, '/images/categories/laptops.jpg'),
('Audio', 'Headphones, speakers, and audio equipment', 1, '/images/categories/audio.jpg'),
('Cameras', 'Digital cameras and photography equipment', 1, '/images/categories/cameras.jpg'),

-- Clothing subcategories
('Men\'s Clothing', 'Men\'s apparel and accessories', 2, '/images/categories/mens-clothing.jpg'),
('Women\'s Clothing', 'Women\'s apparel and accessories', 2, '/images/categories/womens-clothing.jpg'),
('Shoes', 'Footwear for men and women', 2, '/images/categories/shoes.jpg'),
('Accessories', 'Fashion accessories and jewelry', 2, '/images/categories/accessories.jpg');

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('platform_name', 'Emagn Platform', 'string', 'Name of the platform', true),
('platform_description', 'Secure online transaction platform', 'string', 'Platform description', true),
('platform_fee_percentage', '2.5', 'number', 'Platform fee percentage for transactions', false),
('minimum_transaction_amount', '1.00', 'number', 'Minimum transaction amount in USD', true),
('maximum_transaction_amount', '10000.00', 'number', 'Maximum transaction amount in USD', true),
('escrow_hold_days', '7', 'number', 'Number of days to hold escrow after delivery', false),
('dispute_resolution_days', '14', 'number', 'Maximum days to resolve disputes', false),
('email_notifications_enabled', 'true', 'boolean', 'Enable email notifications', false),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', true),
('registration_enabled', 'true', 'boolean', 'Allow new user registrations', true),
('guest_browsing_enabled', 'true', 'boolean', 'Allow guest users to browse products', true);

-- Insert default admin users (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified, is_active) VALUES
('superadmin@emagn.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super', 'Admin', 'super_admin', true, true),
('admin@emagn.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Platform', 'Admin', 'admin', true, true);

-- Insert sample users for testing
INSERT INTO users (email, password_hash, first_name, last_name, role, phone, address, city, state, country, postal_code, is_verified, is_active) VALUES
('buyer1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Buyer', 'buyer', '+1234567890', '123 Main St', 'New York', 'NY', 'USA', '10001', true, true),
('buyer2@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Customer', 'buyer', '+1234567891', '456 Oak Ave', 'Los Angeles', 'CA', 'USA', '90210', true, true),
('seller1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike', 'Seller', 'seller', '+1234567892', '789 Pine St', 'Chicago', 'IL', 'USA', '60601', true, true),
('seller2@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah', 'Merchant', 'seller', '+1234567893', '321 Elm St', 'Houston', 'TX', 'USA', '77001', true, true);

-- Insert sample products
INSERT INTO products (seller_id, category_id, title, description, price, quantity_available, condition, images, specifications, shipping_cost, shipping_method, estimated_delivery_days, is_active, is_featured) VALUES
(3, 9, 'iPhone 14 Pro Max', 'Latest iPhone with advanced camera system and A16 Bionic chip. 128GB storage, Space Black color.', 999.99, 1, 'new', '["/images/products/iphone14-1.jpg", "/images/products/iphone14-2.jpg"]', '{"storage": "128GB", "color": "Space Black", "screen_size": "6.7 inch", "camera": "48MP Main Camera"}', 15.99, 'Standard Shipping', 3, true, true),
(3, 10, 'MacBook Pro 14-inch', 'Apple MacBook Pro with M2 Pro chip, 16GB RAM, 512GB SSD. Perfect for professionals and creatives.', 1999.99, 1, 'new', '["/images/products/macbook-1.jpg", "/images/products/macbook-2.jpg"]', '{"processor": "M2 Pro", "ram": "16GB", "storage": "512GB SSD", "screen_size": "14 inch"}', 25.99, 'Express Shipping', 2, true, true),
(4, 11, 'Sony WH-1000XM4 Headphones', 'Industry-leading noise canceling wireless headphones with 30-hour battery life.', 279.99, 2, 'like_new', '["/images/products/sony-headphones-1.jpg"]', '{"battery_life": "30 hours", "noise_canceling": "Yes", "wireless": "Yes", "color": "Black"}', 8.99, 'Standard Shipping', 5, true, false),
(4, 12, 'Canon EOS R5 Camera', 'Professional mirrorless camera with 45MP full-frame sensor and 8K video recording.', 3899.99, 1, 'new', '["/images/products/canon-r5-1.jpg", "/images/products/canon-r5-2.jpg"]', '{"sensor": "45MP Full-Frame", "video": "8K", "lens_mount": "RF", "stabilization": "In-body"}', 35.99, 'Express Shipping', 3, true, true),
(3, 13, 'Nike Air Max 270', 'Comfortable running shoes with Max Air cushioning. Size 10, Black/White colorway.', 129.99, 1, 'good', '["/images/products/nike-airmax-1.jpg"]', '{"size": "10", "color": "Black/White", "type": "Running Shoes", "brand": "Nike"}', 7.99, 'Standard Shipping', 4, true, false),
(4, 14, 'Designer Handbag', 'Luxury leather handbag in excellent condition. Perfect for special occasions.', 299.99, 1, 'like_new', '["/images/products/handbag-1.jpg", "/images/products/handbag-2.jpg"]', '{"material": "Leather", "color": "Black", "size": "Medium", "brand": "Designer"}', 12.99, 'Standard Shipping', 5, true, false);

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, type, action_url) VALUES
(1, 'Welcome to Emagn Platform', 'Welcome to the Emagn platform! You now have full administrative access.', 'system', '/admin/dashboard'),
(2, 'Admin Access Granted', 'You have been granted admin privileges on the Emagn platform.', 'system', '/admin/dashboard'),
(3, 'Account Verified', 'Your account has been successfully verified. You can now start buying and selling!', 'system', '/dashboard'),
(4, 'Account Verified', 'Your account has been successfully verified. You can now start buying and selling!', 'system', '/dashboard'),
(5, 'Account Verified', 'Your account has been successfully verified. You can now start buying and selling!', 'system', '/dashboard'),
(6, 'Account Verified', 'Your account has been successfully verified. You can now start buying and selling!', 'system', '/dashboard');