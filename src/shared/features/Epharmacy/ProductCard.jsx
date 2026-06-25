import React from 'react';
import PropTypes from 'prop-types';
import { FaShoppingCart, FaHeart } from 'react-icons/fa';
import "@/shared/features/Epharmacy/Products.css";

const ProductCard = ({ product, onAddToCart }) => { // Accept onAddToCart prop
    return (
        <div className="product-card">
            <img src={product.ImagePath} alt={product.MedicineName} />
            <h3>{product.MedicineName}</h3>
            <p> Rs. {product.Price.toFixed(2)}</p>
            <div className="product-actions">
                <button
                    className="add-to-cart"
                    onClick={() => onAddToCart(product.MedicineName)} // Pass product identifier (assuming MedicineName is unique, or use an ID if available)
                >
                    <FaShoppingCart />
                </button>
                <button className="add-to-wishlist">
                    <FaHeart />
                </button>
            </div>
        </div>
    );
};

ProductCard.propTypes = {
    product: PropTypes.shape({
        ImagePath: PropTypes.string,
        MedicineName: PropTypes.string,
        Price: PropTypes.number
    }).isRequired,
    onAddToCart: PropTypes.func.isRequired,
};

export default ProductCard;