import React, { useState, useEffect } from "react";
import Sidebar from "@/shared/features/Epharmacy/Sidebar";
import ProductCard from "@/shared/features/Epharmacy/ProductCard";
import { medicineData } from "@/shared/data/medicineData";
import "@/shared/features/Epharmacy/Products.css";
import { FaShoppingCart } from "react-icons/fa";
import { useToast } from "@/shared/context/ToastContext";

const ProductList = () => {
  const [products] = useState(medicineData);
  const toast = useToast();
  const [filters, setFilters] = useState({ category: [], subcategory: [] });
  const [sortBy, setSortBy] = useState("default");
  const [cartCount, setCartCount] = useState(0); // New state for cart count

  // Fetch initial cart count when component mounts
  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const response = await fetch('/api/get_cart_count.php'); // Adjust path if needed
        const data = await response.json();
        if (data.success) {
          setCartCount(data.cartCount);
        } else {
          console.error("Failed to fetch cart count:", data.message);
        }
      } catch (error) {
        console.error("Error fetching cart count:", error);
      }
    };
    fetchCartCount();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value, checked } = event.target;
    setFilters((prevFilters) => {
      const updatedFilters = { ...prevFilters };
      if (checked) {
        updatedFilters[name] = [...prevFilters[name], value];
      } else {
        updatedFilters[name] = prevFilters[name].filter(
          (item) => item !== value
        );
      }
      return updatedFilters;
    });
  };

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  const filterProducts = () => {
    return products.filter((product) => {
      const categoryMatch =
        filters.category.length === 0 ||
        filters.category.includes(product.MainCategory);
      const subcategoryMatch =
        filters.subcategory.length === 0 ||
        filters.subcategory.includes(product.SubCategory);
      return categoryMatch && subcategoryMatch;
    });
  };

  const sortProducts = (filteredProducts) => {
    switch (sortBy) {
      case "price-low-to-high":
        return [...filteredProducts].sort((a, b) => a.Price - b.Price);
      case "price-high-to-low":
        return [...filteredProducts].sort((a, b) => b.Price - a.Price);
      case "name-a-z":
        return [...filteredProducts].sort((a, b) =>
          a.MedicineName.localeCompare(b.MedicineName)
        );
      case "name-z-a":
        return [...filteredProducts].sort((a, b) =>
          b.MedicineName.localeCompare(a.MedicineName)
        );
      default:
        return filteredProducts;
    }
  };

  // New function to handle adding to cart
  const handleAddToCart = async (productId) => {
    try {
      const response = await fetch('/api/add_to_cart.php', { // Adjust path if needed
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId: productId }),
      });
      const data = await response.json();
      if (data.success) {
        setCartCount(data.cartCount); // Update cart count from the response
        console.log(data.message);
      } else {
        console.error("Failed to add to cart:", data.message);
        toast.error(data.message); // Inform the user
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("An error occurred while adding to cart.");
    }
  };

  const filteredProducts = filterProducts();
  const sortedProducts = sortProducts(filteredProducts);

  return (
    <div className="phar-container">
      <button className="cart">
        <FaShoppingCart /> {cartCount > 0 && <span className="cart-badge">{cartCount}</span>} {/* Display cart count */}
      </button>
      <div>
        <h4>DocX / Pharmacy</h4>
        <Sidebar
          products={medicineData}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </div>
      <div className="shop-container">
        <main className="product-list">
          <div className="product-list-header">
            <h2></h2>
            <div className="sort-options">
              <label htmlFor="sort-by">Sort By:</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={handleSortChange}
                className="dropdown"
              >
                <option value="default">Default</option>
                <option value="price-low-to-high">Price (Low to High)</option>
                <option value="price-high-to-low">Price (High to Low)</option>
                <option value="name-a-z">Name (A-Z)</option>
                <option value="name-z-a">Name (Z-A)</option>
              </select>
            </div>
          </div>
          <div className="products-grid">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.MedicineName}
                product={product}
                onAddToCart={handleAddToCart} // Pass the function down
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProductList;