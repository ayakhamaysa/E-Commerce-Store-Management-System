# E-Commerce Store & Management System

A responsive e-commerce store and administration system built to manage products, inventory, discounts, orders, and store content from one interface.

## Overview

This project provides a customer-facing online store together with an admin dashboard. It uses Supabase for authentication, database services, and storage, while the frontend is built with HTML, CSS, and JavaScript.

## Key Features

- Responsive online storefront
- Product categories and product catalog
- Category-level discounts
- Shopping cart and order workflow
- Product variants such as colors and sizes
- Inventory and stock management
- Multiple product images
- Best-selling products
- Admin dashboard
- Product and category management
- Order management and status updates
- Printable order details
- WhatsApp order communication
- Store logo and slider management
- Supabase Authentication
- PostgreSQL database through Supabase
- Supabase Storage
- Row Level Security (RLS)

## Technologies

- HTML5
- CSS3
- JavaScript
- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Netlify

## Project Structure

```text
.
├── index.html
├── admin.html
├── app.js
├── styles.css
├── config.js
└── database-setup.sql
```

## Setup

1. Create a new Supabase project.
2. Run `database-setup.sql` in the Supabase SQL Editor.
3. Configure authentication and create an administrator account.
4. Update the placeholder values in `config.js` with your own project settings.
5. Open `index.html` locally or deploy the project to a static hosting service such as Netlify.

> Important: Never commit database passwords, service-role keys, or other private credentials to the repository.

## Admin Dashboard

The admin interface can be opened through:

```text
admin.html
```

Authentication and administrator permissions should be configured in Supabase before use.

## Purpose

The project was developed as a practical full-stack e-commerce solution focused on store management, inventory control, order processing, and a responsive shopping experience.

## Screenshots

Add screenshots of the storefront, product pages, cart, and admin dashboard here before showcasing the project publicly.

## Author

Computer Systems Engineering portfolio project.
