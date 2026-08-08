# 🛍️ E-Commerce Store & Management System

A responsive e-commerce store and administration system designed to manage products, inventory, discounts, orders, and store content through an integrated customer storefront and admin dashboard.

![E-Commerce Store Preview](Images/ecommerce-preview.png)

---

## 📖 Project Overview

The **E-Commerce Store & Management System** is a full-stack web project that provides a responsive online shopping experience together with a complete administration dashboard.

Customers can browse products, view categories and discounts, select product variants, manage their shopping cart, and place orders.

Administrators can manage products, categories, inventory, discounts, orders, product images, and store content through a dedicated dashboard.

The project uses **Supabase** for authentication, database services, and storage, while the frontend is developed using **HTML, CSS, and JavaScript**.

---

## ✨ Key Features

### 🛒 Customer Store

- Responsive e-commerce storefront
- Product categories and product catalog
- Product details and multiple images
- Category-level discounts
- Best-selling products
- Product variants such as colors and sizes
- Shopping cart
- Order placement workflow
- Responsive design for desktop, tablet, and mobile devices

### ⚙️ Admin Dashboard

- Secure administrator authentication
- Product management
- Category management
- Inventory and stock management
- Product variant management
- Discount management
- Multiple product image management
- Order management
- Order status updates
- Printable order details
- WhatsApp order communication
- Store logo management
- Homepage slider management

---

## 🗄️ Backend & Database

The system integrates with **Supabase** to provide:

- PostgreSQL database
- Supabase Authentication
- Supabase Storage
- Row Level Security (RLS)
- Product and inventory data management
- Order storage and management
- Image storage

---

## 🛠️ Technologies

- HTML5
- CSS3
- JavaScript
- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Row Level Security (RLS)
- Netlify

---

## 📂 Project Structure

```text
E-Commerce-Store-Management-System/
│
├── Images/
│   └── ecommerce-preview.png
│
├── index.html
├── admin.html
├── app.js
├── styles.css
├── config.js
├── config.example.js
├── database-setup.sql
├── .gitignore
└── README.md
```

---

## 🚀 Setup

1. Create a new Supabase project.

2. Run:

```text
database-setup.sql
```

in the Supabase SQL Editor.

3. Configure Supabase Authentication and create an administrator account.

4. Update the placeholder configuration values in:

```text
config.js
```

with your own Supabase project settings.

5. Open:

```text
index.html
```

locally or deploy the project using a static hosting service such as Netlify.

> ⚠️ Never commit database passwords, service-role keys, or other private credentials to the repository.

---

## 🔐 Admin Dashboard

The administration interface is available through:

```text
admin.html
```

Administrator authentication and permissions must be configured in Supabase before using the dashboard.

---

## 🎯 Project Purpose

This project was developed as a practical e-commerce solution combining **frontend development, database integration, authentication, inventory management, and order processing**.

It demonstrates the development of a complete store management workflow, from the customer shopping experience to administrative control of products, inventory, discounts, and orders.

---

## 📸 Screenshots

### E-Commerce Store & Admin Dashboard

![E-Commerce Store and Admin Dashboard](Images/ecommerce-preview.png)

The system is designed with responsive interfaces for desktop, tablet, and mobile devices.
---

## 👩‍💻 Developer

**Aya Khamaysa**

Computer Systems Engineering  
Arab American University
