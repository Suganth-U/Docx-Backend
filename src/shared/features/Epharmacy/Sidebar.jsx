import React from "react";
import PropTypes from "prop-types";
import "@/shared/features/Epharmacy/Products.css";
import { Link } from "react-router-dom";
import { assets } from "@/shared/lib/assets";

const Sidebar = ({ products, filters, onFilterChange }) => {
  const uniqueCategories = [
    ...new Set(products.map((product) => product.MainCategory)),
  ];
  const uniqueSubCategories = [
    ...new Set(products.map((product) => product.SubCategory)),
  ];

  return (
    <>
      <div className="sidebar">
        <Link to="/">
          <div className="backhome" id="backhome">
            <img src={assets.arrow} alt="img" />
            <span>Back to Home</span>
          </div>
        </Link>{" "}
        <div className="filter-group">
          <h3>Category</h3>
          <div id="category-filters">
            {uniqueCategories.map((category) => (
              <label key={category}>
                <input
                  type="checkbox"
                  name="category"
                  value={category}
                  checked={filters.category.includes(category)}
                  onChange={onFilterChange}
                />
                {category}
              </label>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <h3>Sub Category</h3>
          <div id="subcategory-filters">
            {uniqueSubCategories.map((subCategory) => (
              <label key={subCategory}>
                <input
                  type="checkbox"
                  name="subcategory"
                  value={subCategory}
                  checked={filters.subcategory.includes(subCategory)}
                  onChange={onFilterChange}
                />
                {subCategory}
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

Sidebar.propTypes = {
  products: PropTypes.array.isRequired,
  filters: PropTypes.shape({
    category: PropTypes.array,
    subcategory: PropTypes.array,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

export default Sidebar;
