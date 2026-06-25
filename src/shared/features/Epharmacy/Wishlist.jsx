import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaHeart,
  FaRegHeart,
  FaShoppingBag,
  FaShieldAlt,
  FaTrash,
} from "react-icons/fa";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import StatusModal from "@/shared/components/common/StatusModal";
import { addToCart, getWishlist, toggleWishlist } from "@/shared/lib/storage";
import {
  FALLBACK_MEDICINE_IMAGE,
  PHARMACY_THEME,
  formatCurrency,
} from "@/shared/features/Epharmacy/pharmacyShared";

const Page = styled.div`
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(23, 66, 160, 0.08), transparent 30%),
    linear-gradient(180deg, #f8f9fc 0%, #eef3fb 100%);
`;

const Container = styled.div`
  max-width: 1320px;
  margin: 0 auto;
  padding: 28px 24px 72px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 22px;

  h1 {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3rem);
    letter-spacing: -0.05em;
  }

  p {
    margin: 8px 0 0;
    color: ${PHARMACY_THEME.inkSoft};
    line-height: 1.7;
  }
`;

const BackButton = styled.button`
  border: none;
  background: white;
  border-radius: 16px;
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  cursor: pointer;
  padding: 14px 16px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 10px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 18px;
`;

const Card = styled.article`
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  border-radius: 28px;
  overflow: hidden;
  box-shadow: ${PHARMACY_THEME.shadowSoft};
  display: grid;
`;

const Media = styled.div`
  position: relative;
  min-height: 240px;
  display: grid;
  place-items: center;
  padding: 22px;
  background:
    radial-gradient(circle at top, rgba(23, 66, 160, 0.1), transparent 55%),
    linear-gradient(180deg, #ffffff, #eef3fb);

  img {
    width: min(100%, 182px);
    height: 182px;
    object-fit: contain;
  }
`;

const IconButton = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  background: rgba(255, 255, 255, 0.92);
  display: grid;
  place-items: center;
  cursor: pointer;
  color: ${(props) => (props.$danger ? PHARMACY_THEME.danger : PHARMACY_THEME.danger)};
`;

const Body = styled.div`
  padding: 22px;
  display: grid;
  gap: 14px;

  .eyebrow {
    color: ${PHARMACY_THEME.inkMuted};
    text-transform: uppercase;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    font-weight: 800;
  }

  h3 {
    margin: 0;
    font-size: 1.08rem;
    line-height: 1.4;
  }

  p {
    margin: 0;
    color: ${PHARMACY_THEME.inkSoft};
    line-height: 1.65;
  }

  strong {
    font-size: 1.14rem;
  }
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-radius: 999px;
    background: ${PHARMACY_THEME.surface};
    color: ${PHARMACY_THEME.inkSoft};
    font-size: 0.84rem;
    font-weight: 700;
  }
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  button {
    border: none;
    cursor: pointer;
    border-radius: 16px;
    padding: 14px 16px;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .primary {
    background: ${PHARMACY_THEME.ink};
    color: white;
  }

  .secondary {
    background: ${PHARMACY_THEME.surface};
    color: ${PHARMACY_THEME.ink};
    border: 1px solid ${PHARMACY_THEME.lineStrong};
  }
`;

const EmptyState = styled.div`
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid ${PHARMACY_THEME.lineStrong};
  border-radius: 30px;
  box-shadow: ${PHARMACY_THEME.shadowSoft};
  text-align: center;
  padding: 72px 28px;

  h2 {
    margin-bottom: 10px;
    font-size: 1.8rem;
  }

  p {
    margin: 0 auto 20px;
    max-width: 54ch;
    color: ${PHARMACY_THEME.inkSoft};
    line-height: 1.7;
  }

  button {
    border: none;
    border-radius: 18px;
    background: ${PHARMACY_THEME.brand};
    color: white;
    cursor: pointer;
    padding: 14px 18px;
    font-weight: 800;
  }
`;

const Wishlist = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    const syncWishlist = () => setItems(getWishlist());
    syncWishlist();
    window.addEventListener("wishlistUpdated", syncWishlist);
    return () => window.removeEventListener("wishlistUpdated", syncWishlist);
  }, []);

  const handleRemove = (item) => {
    toggleWishlist(item);
    setStatusModal({
      isOpen: true,
      type: "info",
      message: `${item.name} removed from wishlist.`,
    });
    setItems(getWishlist());
  };

  const handleAddToCart = (item) => {
    addToCart(item);
    setStatusModal({
      isOpen: true,
      type: "success",
      message: `${item.name} added to cart.`,
    });
  };

  return (
    <Page>
      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal((current) => ({ ...current, isOpen: false }))}
        type={statusModal.type}
        message={statusModal.message}
      />

      <Navigationbar />
      <Container>
        <Header>
          <div>
            <h1>Saved for later</h1>
            <p>
              Keep a shortlist of refill candidates, compare brands, and move the right
              items into checkout when you’re ready.
            </p>
          </div>
          <BackButton onClick={() => navigate("/pharmacy")} type="button">
            <FaArrowLeft /> Back to pharmacy
          </BackButton>
        </Header>

        {!items.length ? (
          <EmptyState>
            <h2>Your wishlist is still empty</h2>
            <p>
              Save medicines you want to revisit so you can compare them side by side with
              stock, delivery timing, and prescription requirements.
            </p>
            <button onClick={() => navigate("/pharmacy")} type="button">
              Browse catalog
            </button>
          </EmptyState>
        ) : (
          <Grid>
            {items.map((item) => (
              <Card key={item.medicineId || item.name}>
                <Media>
                  <IconButton $danger onClick={() => handleRemove(item)} type="button">
                    <FaTrash />
                  </IconButton>
                  <img
                    alt={item.name}
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_MEDICINE_IMAGE;
                    }}
                    src={item.image}
                  />
                </Media>

                <Body>
                  <span className="eyebrow">{item.category}</span>
                  <h3>{item.name}</h3>
                  <p>{item.manufacturer}</p>

                  <Meta>
                    <span>
                      {item.requiresPrescription ? <FaShieldAlt /> : <FaRegHeart />}
                      {item.requiresPrescription ? "Prescription review" : "Quick purchase"}
                    </span>
                    <span>
                      <FaHeart /> Saved item
                    </span>
                  </Meta>

                  <strong>{formatCurrency(item.price)}</strong>

                  <Actions>
                    <button className="primary" onClick={() => handleAddToCart(item)} type="button">
                      <FaShoppingBag /> Add to cart
                    </button>
                    <button
                      className="secondary"
                      onClick={() => navigate(`/product/${item.medicineId}`)}
                      type="button"
                    >
                      View
                    </button>
                  </Actions>
                </Body>
              </Card>
            ))}
          </Grid>
        )}
      </Container>
      <Footer />
    </Page>
  );
};

export default Wishlist;
