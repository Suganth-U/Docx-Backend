import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  FaHeart,
  FaRegHeart,
  FaSearch,
} from "react-icons/fa";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import StatusModal from "@/shared/components/common/StatusModal";
import {
  fetchMedicines,
  normalizeCartItem,
} from "@/shared/features/Epharmacy/pharmacyClient";
import {
  FALLBACK_MEDICINE_IMAGE,
  formatCurrency,
} from "@/shared/features/Epharmacy/pharmacyShared";
import {
  addToCart,
  isInWishlist,
  toggleWishlist,
} from "@/shared/lib/storage";

const SORT_OPTIONS = [
  "Most relevant",
  "Price: Low to High",
  "Price: High to Low",
  "Newest First",
  "Prescription First",
];

const PRICE_OPTIONS = [
  { label: "Under LKR 500", min: 0, max: 500 },
  { label: "LKR 500 - 1,500", min: 500, max: 1500 },
  { label: "LKR 1,500 - 3,500", min: 1500, max: 3500 },
  { label: "Above LKR 3,500", min: 3500, max: Number.POSITIVE_INFINITY },
];

const normalizeQueryText = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const areSameValues = (left = [], right = []) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const parsePharmacySearch = (search = "") => {
  const params = new URLSearchParams(search);
  const categoryValues = params.getAll("category").filter(Boolean);

  return {
    q: params.get("q") || "",
    categories: [...new Set(categoryValues)],
    rxOnly: params.get("rx") === "1",
  };
};

const buildPharmacySearchParams = ({
  q = "",
  categories = [],
  rxOnly = false,
}) => {
  const params = new URLSearchParams();

  if (normalizeQueryText(q)) {
    params.set("q", normalizeQueryText(q));
  }

  [...new Set(categories.filter(Boolean))].forEach((category) => {
    params.append("category", category);
  });

  if (rxOnly) {
    params.set("rx", "1");
  }

  return params;
};

const Page = styled.div`
  min-height: 100vh;
  background: white;
  color: #111;
  font-family: 'Inter', sans-serif;
`;

const Breadcrumb = styled.div`
  padding: 24px 40px;
  color: #666;
  font-size: 14px;
  
  span.active { color: #683B93; font-weight: 500; }
  span.sep { margin: 0 8px; color: #ccc; }
`;

const TopBar = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 40px 30px 40px;
  font-size: 14px;
  color: #666;

  .left { display: flex; align-items: center; gap: 8px; }
  .right { display: flex; align-items: center; gap: 24px; }
  
  select {
    border: none;
    background: transparent;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    color: #111;
  }

  input[type="checkbox"] {
    accent-color: #683B93;
    margin-right: 8px;
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  padding: 8px 16px;
  gap: 8px;
  width: 100%;
  max-width: 450px;
  transition: all 0.2s;
  position: relative;

  &:focus-within {
    border-color: #683B93;
    box-shadow: 0 0 0 2px rgba(104,59,147,0.1);
  }

  input {
    border: none;
    outline: none;
    background: transparent;
    width: 100%;
    font-size: 14px;
    color: #111;
    &::placeholder {
      color: #999;
    }
  }

  svg {
    color: #999;
  }
`;

const Suggestions = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  z-index: 100;
`;

const SuggestionRow = styled.button`
  width: 100%;
  border: none;
  background: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f8f9fa;
  }

  img {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border-radius: 8px;
    background: #f8f9fa;
    padding: 4px;
  }

  .details {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    strong {
      font-size: 14px;
      color: #111;
    }
    
    span {
      font-size: 12px;
      color: #777;
    }
  }

  em {
    font-style: normal;
    color: #683B93;
    font-weight: 700;
    font-size: 14px;
  }
`;

const ContentLayout = styled.div`
  display: flex;
  gap: 40px;
  padding: 0 40px 60px 40px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 0 20px 40px 20px;
  }
`;

const Sidebar = styled.aside`
  width: 240px;
  flex-shrink: 0;

  h3 {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 20px;
    color: #111;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0 0 40px 0;
  }

  li {
    margin-bottom: 14px;
  }

  button {
    background: transparent;
    border: none;
    padding: 0;
    color: #555;
    font-size: 14px;
    cursor: pointer;
    text-align: left;
    
    &:hover, &.active {
      color: #683B93;
      font-weight: 600;
    }
  }

  .price-slider {
    width: 100%;
    margin-top: 20px;
  }
`;

const MainContent = styled.div`
  flex: 1;
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
`;

const ProductCard = styled.div`
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 16px;
  position: relative;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
    border-color: transparent;
  }

  .badges {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 2;
  }

  .badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
  }
  .badge.sale { background: #683B93; }
  .badge.hot { background: #E63946; }

  .image-wrapper {
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    position: relative;
    cursor: pointer;

    img {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }

    .hover-actions {
      position: absolute;
      bottom: 0;
      display: flex;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.2s;

      button {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: white;
        border: 1px solid #eee;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #666;
        
        &:hover { color: #683B93; border-color: #683B93; }
      }
    }
  }

  &:hover .hover-actions {
    opacity: 1;
  }

  .stars {
    color: #111;
    font-size: 12px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    
    span { color: #999; }
  }

  h4 {
    font-size: 14px;
    font-weight: 600;
    color: #222;
    margin: 0 0 6px 0;
    line-height: 1.4;
    cursor: pointer;
    &:hover { color: #683B93; }
  }

  .subtitle {
    font-size: 12px;
    color: #888;
    margin-bottom: auto;
    padding-bottom: 16px;
  }

  .prices {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;

    .old {
      text-decoration: line-through;
      color: #999;
      font-size: 12px;
    }
    .new {
      font-weight: 700;
      font-size: 16px;
      color: #111;
    }
    .discount {
      color: #E63946;
      font-size: 12px;
    }
  }

  .add-btn {
    width: 100%;
    padding: 12px;
    background: white;
    border: 1px solid #e0e0e0;
    color: #111;
    border-radius: 24px;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;

    &:hover {
      border-color: #683B93;
      color: #683B93;
    }
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 40px;

  button {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #eee;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    font-size: 14px;
    color: #666;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: #f5f5f5;
    }

    &.active {
      background: #683B93;
      color: white;
      border-color: #683B93;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #666;
  
  h3 {
    font-size: 18px;
    color: #111;
    margin-bottom: 12px;
  }
`;

const Pharmacy = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSearchContext = useMemo(
    () => parsePharmacySearch(location.search),
    [location.search]
  );
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchContext.q);
  const [sortOption, setSortOption] = useState(SORT_OPTIONS[0]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showSaleOnly, setShowSaleOnly] = useState(false);
  
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });
  
  const [filters, setFilters] = useState({
    categories: initialSearchContext.categories,
    priceRanges: [],
    prescriptionTypes: [],
    rxOnly: initialSearchContext.rxOnly,
    inStockOnly: false,
  });

  useEffect(() => {
    const nextSearchContext = parsePharmacySearch(location.search);
    setSearchTerm((current) => current === nextSearchContext.q ? current : nextSearchContext.q);
    setFilters((current) => {
      if (areSameValues(current.categories, nextSearchContext.categories) && current.rxOnly === nextSearchContext.rxOnly) {
        return current;
      }
      return { ...current, categories: nextSearchContext.categories, rxOnly: nextSearchContext.rxOnly };
    });
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      setLoading(true);
      try {
        const data = await fetchMedicines();
        if (!cancelled) setProducts(data);
      } catch {
        if (!cancelled) { setProducts([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadCatalog();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const syncCounts = () => {};
    const syncWishlist = () => {};
    window.addEventListener("cartUpdated", syncCounts);
    window.addEventListener("wishlistUpdated", syncWishlist);
    return () => {
      window.removeEventListener("cartUpdated", syncCounts);
      window.removeEventListener("wishlistUpdated", syncWishlist);
    };
  }, []);

  useEffect(() => {
    const nextSearch = buildPharmacySearchParams({
      q: searchTerm,
      categories: filters.categories,
      rxOnly: filters.rxOnly,
    }).toString();
    const currentSearch = location.search.startsWith("?") ? location.search.slice(1) : location.search;
    const timer = window.setTimeout(() => {
      if (nextSearch !== currentSearch) {
        navigate({ pathname: "/pharmacy", search: nextSearch ? `?${nextSearch}` : "" }, { replace: true });
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [filters.categories, filters.rxOnly, location.search, navigate, searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm, sortOption, showSaleOnly, itemsPerPage]);

  const uniqueCategories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const matchesPrice = (price) => {
      if (!filters.priceRanges.length) return true;
      return PRICE_OPTIONS.filter((option) => filters.priceRanges.includes(option.label)).some(
        (option) => price >= option.min && price < option.max
      );
    };

    const list = products.filter((product) => {
      const matchesSearch = !query || product.name.toLowerCase().includes(query) || product.category.toLowerCase().includes(query);
      const matchesCategory = !filters.categories.length || filters.categories.includes(product.category);
      const matchesSale = !showSaleOnly || (product.discount && product.discount > 0);
      
      const isRx = product.requiresPrescription;
      let matchesPrescription = true;
      if (filters.prescriptionTypes.length > 0) {
        if (filters.prescriptionTypes.includes("Prescription Required") && filters.prescriptionTypes.includes("Non-Prescription")) {
          matchesPrescription = true;
        } else if (filters.prescriptionTypes.includes("Prescription Required")) {
          matchesPrescription = isRx;
        } else if (filters.prescriptionTypes.includes("Non-Prescription")) {
          matchesPrescription = !isRx;
        }
      } else if (filters.rxOnly) {
        matchesPrescription = isRx;
      }

      return matchesSearch && matchesCategory && matchesPrice(product.price) && matchesSale && matchesPrescription;
    });

    return list.sort((a, b) => {
      if (sortOption === "Price: Low to High") return a.price - b.price;
      if (sortOption === "Price: High to Low") return b.price - a.price;
      if (sortOption === "Newest First") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return a.name.localeCompare(b.name);
    });
  }, [filters, products, searchTerm, sortOption, showSaleOnly]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.manufacturer?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [products, searchTerm]);

  const toggleCategory = (category) => {
    setFilters((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((value) => value !== category)
        : [...current.categories, category],
    }));
  };

  const togglePriceRange = (label) => {
    setFilters((current) => ({
      ...current,
      priceRanges: current.priceRanges.includes(label)
        ? current.priceRanges.filter((value) => value !== label)
        : [...current.priceRanges, label],
    }));
  };

  const togglePrescriptionType = (type) => {
    setFilters((current) => ({
      ...current,
      prescriptionTypes: current.prescriptionTypes.includes(type)
        ? current.prescriptionTypes.filter((value) => value !== type)
        : [...current.prescriptionTypes, type],
    }));
  };

  const handleAddToCart = (product) => {
    addToCart(normalizeCartItem(product));
    setStatusModal({ isOpen: true, type: "success", message: `${product.name} added to cart.` });
  };

  const handleWishlist = (product) => {
    toggleWishlist(product);
    // Component will re-render due to some other state change if needed, 
    // or we can add a local state for wishlist updates if necessary.
  };

  if (loading) {
    return <Page><Navigationbar /><div style={{padding: "100px", textAlign: "center"}}>Loading pharmacy catalog...</div></Page>;
  }

  return (
    <Page>
      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(c => ({ ...c, isOpen: false }))}
        type={statusModal.type}
        message={statusModal.message}
      />
      <Navigationbar />
      
      <Breadcrumb>
        <span>Home</span> <span className="sep">&gt;</span> <span>Shop</span> <span className="sep">&gt;</span> <span className="active">Personal Care</span>
      </Breadcrumb>

      <TopBar>
        <div className="left">
          Sort by: 
          <select value={sortOption} onChange={e => setSortOption(e.target.value)}>
            {SORT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        
        <div className="right" style={{flex: 1, display: 'flex', justifyContent: 'flex-end'}}>
          <SearchBar>
            <FaSearch />
            <input 
              type="text" 
              placeholder="Search medicines, brands, symptoms..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <Suggestions>
                {suggestions.map((item) => (
                  <SuggestionRow
                    key={item.medicineId}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      navigate(`/product/${item.medicineId}`);
                    }}
                    type="button"
                  >
                    <img
                      alt={item.name}
                      onError={(e) => { e.currentTarget.src = FALLBACK_MEDICINE_IMAGE; }}
                      src={item.image || FALLBACK_MEDICINE_IMAGE}
                    />
                    <div className="details">
                      <strong>{item.name}</strong>
                      <span>{item.manufacturer || "N/A"} · {item.category}</span>
                    </div>
                    <em>{formatCurrency(item.price)}</em>
                  </SuggestionRow>
                ))}
              </Suggestions>
            )}
          </SearchBar>
        </div>
      </TopBar>

      <ContentLayout>
        <Sidebar>
          <h3>Shop By Categories</h3>
          <ul>
            {uniqueCategories.map(cat => {
              const count = products.filter(p => p.category === cat).length;
              return (
                <li key={cat}>
                  <button 
                    className={filters.categories.includes(cat) ? "active" : ""}
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat} ({count})
                  </button>
                </li>
              );
            })}
          </ul>
          
          <h3>Price</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {PRICE_OPTIONS.map(option => (
              <li key={option.label} style={{ marginBottom: '12px' }}>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#555'}}>
                  <input 
                    type="checkbox" 
                    checked={filters.priceRanges.includes(option.label)}
                    onChange={() => togglePriceRange(option.label)}
                    style={{accentColor: '#683B93', width: '16px', height: '16px'}}
                  />
                  {option.label}
                </label>
              </li>
            ))}
          </ul>

          <h3 style={{ marginTop: '30px' }}>Prescription</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {["Prescription Required", "Non-Prescription"].map(type => (
              <li key={type} style={{ marginBottom: '12px' }}>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#555'}}>
                  <input 
                    type="checkbox" 
                    checked={filters.prescriptionTypes.includes(type)}
                    onChange={() => togglePrescriptionType(type)}
                    style={{accentColor: '#683B93', width: '16px', height: '16px'}}
                  />
                  {type}
                </label>
              </li>
            ))}
          </ul>
        </Sidebar>

        <MainContent>
          {filteredProducts.length === 0 ? (
            <EmptyState>
              <h3>No products found</h3>
              <p>Try adjusting your category or price filters.</p>
              <button onClick={() => setFilters({...filters, categories: [], priceRanges: [], prescriptionTypes: []})} style={{marginTop: '16px', padding: '8px 16px', borderRadius: '20px', background: '#683B93', color: 'white', border: 'none', cursor: 'pointer'}}>Clear Filters</button>
            </EmptyState>
          ) : (
            <>
              <ProductGrid>
                {paginatedProducts.map((product) => {
                  const wishlisted = isInWishlist(product.medicineId) || isInWishlist(product.name);
                  // Generate random stars for visual demo (4-5 stars)
                  const rating = 4; 
                  
                  return (
                    <ProductCard key={product.medicineId}>
                      <div className="badges">
                        {product.discount > 0 && <span className="badge sale">SALE</span>}
                        {product.stock < 10 && <span className="badge hot">HOT</span>}
                      </div>
                      
                      <div className="image-wrapper" onClick={() => navigate(`/product/${product.medicineId}`)}>
                        <img 
                          src={product.image || FALLBACK_MEDICINE_IMAGE} 
                          alt={product.name}
                          onError={(e) => { e.currentTarget.src = FALLBACK_MEDICINE_IMAGE; }}
                        />
                        <div className="hover-actions" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleWishlist(product)}>
                            {wishlisted ? <FaHeart color="#E63946" /> : <FaRegHeart />}
                          </button>
                          <button onClick={() => navigate(`/product/${product.medicineId}`)}><FaSearch /></button>
                        </div>
                      </div>

                      <div className="stars">
                        {[1,2,3,4,5].map(i => <span key={i} style={{color: i <= rating ? '#111' : '#ccc'}}>★</span>)}
                        <span>(3)</span>
                      </div>

                      <h4 onClick={() => navigate(`/product/${product.medicineId}`)}>{product.name}</h4>
                      <div className="subtitle">{product.manufacturer || "Box of 1 Unit"}</div>

                      <div className="prices">
                        {product.discount > 0 ? (
                          <>
                            <span className="old">{formatCurrency(product.price + (product.price * product.discount / 100))}</span>
                            <span className="new">{formatCurrency(product.price)}</span>
                            <span className="discount">({product.discount}%)</span>
                          </>
                        ) : (
                          <span className="new">{formatCurrency(product.price)}</span>
                        )}
                      </div>

                      <button className="add-btn" onClick={() => handleAddToCart(product)}>
                        Add to cart
                      </button>
                    </ProductCard>
                  )
                })}
              </ProductGrid>

              {totalPages > 1 && (
                <Pagination>
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    &lt;
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 3) return true;
                      if (currentPage === 1) return page <= 3;
                      if (currentPage === totalPages) return page >= totalPages - 2;
                      return page >= currentPage - 1 && page <= currentPage + 1;
                    })
                    .map(page => (
                    <button 
                      key={page}
                      className={currentPage === page ? "active" : ""}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}

                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    &gt;
                  </button>
                </Pagination>
              )}
            </>
          )}
        </MainContent>
      </ContentLayout>
      <Footer />
    </Page>
  );
};

export default Pharmacy;
