import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { AnimatePresence, motion } from "framer-motion";
import { FaTimes, FaMinus, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  getCart,
  getCartSubtotal,
  removeFromCart,
  updateCartQuantity,
} from "@/shared/lib/storage";
import { requirePatientSessionForNavigation } from "@/shared/lib/authSession";
import {
  DEFAULT_SHIPPING_FEE,
  FALLBACK_MEDICINE_IMAGE,
  PHARMACY_THEME,
  formatCurrency,
} from "@/shared/features/Epharmacy/pharmacyShared";

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 10006;
  background: rgba(13, 24, 46, 0.44);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
`;

const Drawer = styled(motion.aside)`
  width: min(420px, 100vw);
  background: white;
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-shadow: -18px 0 48px rgba(23, 32, 51, 0.12);
`;

const Header = styled.div`
  padding: 24px;
  background-color: #f7f7f7;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 500;
    color: ${PHARMACY_THEME.ink};
  }

  button {
    border: none;
    background: transparent;
    cursor: pointer;
    color: ${PHARMACY_THEME.inkSoft};
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 24px;
`;

const EmptyState = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;

  svg {
    color: ${PHARMACY_THEME.inkSoft};
    margin-bottom: 24px;
  }

  p {
    color: ${PHARMACY_THEME.ink};
    font-size: 1.05rem;
    margin-bottom: 40px;
  }

  button {
    border: 1px solid ${PHARMACY_THEME.ink};
    border-radius: 30px;
    background: transparent;
    color: ${PHARMACY_THEME.ink};
    cursor: pointer;
    padding: 14px 24px;
    font-weight: 600;
    width: 100%;
    max-width: 280px;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    
    &:hover {
      background: ${PHARMACY_THEME.ink};
      color: white;
    }
  }
`;

const ItemList = styled.div`
  display: grid;
`;

const Item = styled.div`
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) auto;
  gap: 16px;
  padding: 24px 0;
  border-bottom: 1px solid ${PHARMACY_THEME.lineStrong};

  &:last-child {
    border-bottom: none;
  }

  img {
    width: 80px;
    height: 80px;
    object-fit: contain;
    border-radius: 8px;
    background: transparent;
  }
`;

const ItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;

  h4 {
    margin: 0 0 10px 0;
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.4;
    color: ${PHARMACY_THEME.ink};
  }

  .qty-selector {
    display: inline-flex;
    align-items: center;
    border: 1px solid ${PHARMACY_THEME.lineStrong};
    border-radius: 20px;
    width: fit-content;

    button {
      border: none;
      background: transparent;
      width: 32px;
      height: 32px;
      cursor: pointer;
      color: ${PHARMACY_THEME.inkSoft};
      display: flex;
      align-items: center;
      justify-content: center;
    }

    span {
      min-width: 24px;
      text-align: center;
      font-size: 0.9rem;
      font-weight: 500;
    }
  }
`;

const ItemRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;

  .remove {
    border: none;
    background: transparent;
    color: ${PHARMACY_THEME.inkSoft};
    cursor: pointer;
    font-size: 1rem;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .price {
    font-weight: 700;
    font-size: 0.95rem;
  }
`;

const Footer = styled.div`
  padding: 24px;
  background: white;
  display: grid;
  gap: 20px;
  border-top: 1px solid ${PHARMACY_THEME.lineStrong};
`;

const SubtotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  .label {
    font-weight: 700;
    font-size: 1.1rem;
    color: ${PHARMACY_THEME.ink};
  }

  .value {
    font-weight: 700;
    font-size: 1.1rem;
    color: ${PHARMACY_THEME.brand};
  }
`;

const FooterActions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  button {
    border-radius: 30px;
    cursor: pointer;
    padding: 14px 0;
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 0.5px;
  }

  .secondary {
    background: white;
    border: 1px solid ${PHARMACY_THEME.ink};
    color: ${PHARMACY_THEME.ink};
  }

  .primary {
    background: ${PHARMACY_THEME.brand};
    border: 1px solid ${PHARMACY_THEME.brand};
    color: white;
  }
`;

const SadCartIcon = () => (
  <svg width="140" height="140" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 70 L150 65 L145 125 L55 130 Z" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M50 70 L35 72 L30 72" stroke="#333" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="75" cy="155" r="12" stroke="#333" strokeWidth="2"/>
    <circle cx="125" cy="150" r="12" stroke="#333" strokeWidth="2"/>
    <path d="M85 110 Q100 95 115 110" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="95" cy="100" r="1.5" fill="#333"/>
    <circle cx="105" cy="100" r="1.5" fill="#333"/>
    <path d="M110 50 L110 54 M108 52 L112 52" stroke="#666" strokeWidth="1" strokeLinecap="round"/>
    <path d="M70 165 L70 169 M68 167 L72 167" stroke="#666" strokeWidth="1" strokeLinecap="round"/>
    <circle cx="140" cy="50" r="2" stroke="#666" strokeWidth="1"/>
    <path d="M125 165 L127 165" stroke="#666" strokeWidth="1" strokeLinecap="round"/>
    <path d="M140 145 L155 142" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
    <ellipse cx="100" cy="175" rx="60" ry="5" fill="#f0f0f0"/>
  </svg>
);

const CartSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const syncCart = () => setItems(getCart());
    syncCart();

    window.addEventListener("cartUpdated", syncCart);
    return () => window.removeEventListener("cartUpdated", syncCart);
  }, [isOpen]);

  const subtotal = getCartSubtotal();

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        >
          <Drawer
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            initial={{ x: 420 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            <Header>
              <h2>Shopping Cart</h2>
              <button onClick={onClose} type="button">
                <FaTimes />
              </button>
            </Header>

            <Body>
              {!items.length ? (
                <EmptyState>
                  <SadCartIcon />
                  <p>Shopping cart is empty</p>
                  <button
                    onClick={() => {
                      onClose();
                      navigate("/pharmacy");
                    }}
                    type="button"
                  >
                    CONTINUE SHOPPING
                  </button>
                </EmptyState>
              ) : (
                <ItemList>
                  {items.map((item) => (
                    <Item key={item.medicineId || item.name}>
                      <img
                        alt={item.name}
                        onError={(event) => {
                          event.currentTarget.src = FALLBACK_MEDICINE_IMAGE;
                        }}
                        src={item.image}
                      />
                      <ItemInfo>
                        <h4>{item.name}</h4>
                        <div className="qty-selector">
                          <button
                            onClick={() => updateCartQuantity(item.medicineId || item.name, -1)}
                            type="button"
                          >
                            <FaMinus size={10} />
                          </button>
                          <span>{item.qty}</span>
                          <button
                            onClick={() => updateCartQuantity(item.medicineId || item.name, 1)}
                            type="button"
                          >
                            <FaPlus size={10} />
                          </button>
                        </div>
                      </ItemInfo>
                      <ItemRight>
                        <button
                          className="remove"
                          onClick={() => removeFromCart(item.medicineId || item.name)}
                          type="button"
                        >
                          <FaTimes />
                        </button>
                        <div className="price">
                          {formatCurrency(item.price)}
                        </div>
                      </ItemRight>
                    </Item>
                  ))}
                </ItemList>
              )}
            </Body>

            {items.length > 0 && (
              <Footer>
                <SubtotalRow>
                  <span className="label">Subtotal:</span>
                  <span className="value">{formatCurrency(subtotal)}</span>
                </SubtotalRow>

                <FooterActions>
                  <button
                    className="secondary"
                    onClick={() => {
                      onClose();
                      navigate("/cart");
                    }}
                    type="button"
                  >
                    VIEW CART
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      onClose();
                      requirePatientSessionForNavigation(navigate, "/checkout");
                    }}
                    type="button"
                  >
                    CHECKOUT
                  </button>
                </FooterActions>
              </Footer>
            )}
          </Drawer>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

export default CartSidebar;
