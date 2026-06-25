import React from "react";
import styled from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import { assets } from "@/shared/lib/assets";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const Section = styled.section`
  width: 100%;
  max-width: var(--page-max-width);
  margin: 50px auto;
  padding: 50px 5%;
  background: transparent;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;

  .blogs-header-text {
    p {
      color: #8e24aa; /* Teal accent */
      margin: 0 0 10px 0;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 14px;
      letter-spacing: 1px;
    }
    h2 {
      font-size: 45px;
      line-height: 1.2;
      color: #333;
      margin: 0;
      margin: 0;
    }
  }

  a {
    text-decoration: none;
    color: #000;
  }

  span {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-weight: 500;
    transition: color 0.2s;
    
    &:hover {
      color: #8e24aa;
    }
  }
`;

const Container = styled.div`
  width: 100%;
  
  .slick-list {
    margin: 0 -15px;
  }
  .slick-slide > div {
    padding: 0 15px;
  }
  .slick-prev:before, .slick-next:before {
    color: #8e24aa;
  }
`;

const Card = styled.div`
  padding: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 10px 40px rgba(0,0,0,0.04);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;

  &:hover {
    transform: translateY(-12px);
    box-shadow: 0 20px 50px rgba(142, 36, 170, 0.15);
    border-color: rgba(142, 36, 170, 0.3);
  }

  .img-wrapper {
    width: 100%;
    height: 220px;
    overflow: hidden;
    position: relative;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }
  }

  &:hover .img-wrapper img {
    transform: scale(1.05);
  }
  
  .content-wrapper {
    padding: 25px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .category {
    color: #8e24aa;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 15px;
    background: rgba(243, 229, 245, 0.8);
    padding: 6px 14px;
    border-radius: 20px;
    align-self: flex-start;
  }

  h2 {
    font-size: 22px;
    font-weight: 700;
    color: #2D1B4E;
    line-height: 1.4;
    margin: 0 0 20px 0;
    transition: color 0.3s;
  }
  
  &:hover h2 {
    color: #8e24aa;
  }

  .meta-wrapper {
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 20px;
    border-top: 1px solid rgba(0,0,0,0.05);
  }

  span {
    display: flex;
    align-items: center;
    gap: 10px;

    img {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
      margin: 0;
    }
    p {
      color: #777;
      font-size: 13px;
      margin: 0;
    }
  }

  button {
    padding: 8px 0;
    width: fit-content;
    background: transparent;
    border: none;
    color: #8e24aa;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 5px;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Blogs = () => {
  const navigate = useNavigate();
  
  const handleBlogClick = (title, category, authorName, img) => {
    const slug = encodeURIComponent(title.replace(/\\s+/g, '-'));
    navigate(`/blog/${slug}`, { state: { title, category, authorName, img } });
  };

  return (
    <Section className="blogs" data-aos="fade-up">
      <Header>
        <div className="blogs-header-text">
          <p>Health & Wellness</p>
          <h2>
            Latest Articles from <br />
            Health Experts
          </h2>
        </div>
        <Link to="/blog">
          <span>
            View All <FaArrowRight />
          </span>
        </Link>
      </Header>
      <Container>
        <Slider
          dots={true}
          infinite={true}
          speed={500}
          slidesToShow={3}
          slidesToScroll={1}
          responsive={[
            {
              breakpoint: 992,
              settings: {
                slidesToShow: 2,
              }
            },
            {
              breakpoint: 600,
              settings: {
                slidesToShow: 1,
              }
            }
          ]}
        >
          <Card onClick={() => handleBlogClick("The Future of Healthcare: Why Telemedicine is Here to Stay", "Innovation", "Dr. Sarah Smith", assets.blog1)}>
            <div className="img-wrapper">
              <img src={assets.blog1 || assets.blog2} alt="Telemedicine" />
            </div>
            <div className="content-wrapper">
              <div className="category">Innovation</div>
              <h2>The Future of Healthcare: Why Telemedicine is Here to Stay</h2>
              <div className="meta-wrapper">
                <span>
                  <img src={assets.admin} alt="Admin" />
                  <p>Dr. Sarah Smith</p>
                </span>
                <button>Read More <FaArrowRight size={10} /></button>
              </div>
            </div>
          </Card>

          <Card onClick={() => handleBlogClick("Simple Daily Habits for a Stronger Immune System", "Lifestyle", "Dr. Richard James", assets.blog4)}>
            <div className="img-wrapper">
              <img src={assets.blog4 || assets.blog2} alt="Daily Health" />
            </div>
            <div className="content-wrapper">
              <div className="category">Lifestyle</div>
              <h2>Simple Daily Habits for a Stronger Immune System</h2>
              <div className="meta-wrapper">
                <span>
                  <img src={assets.admin} alt="Admin" />
                  <p>Dr. Richard James</p>
                </span>
                <button>Read More <FaArrowRight size={10} /></button>
              </div>
            </div>
          </Card>

          <Card onClick={() => handleBlogClick("Understanding Nutrition Labels: A Guide to Better Eating", "Nutrition", "Dr. Emily Johnson", assets.blog5)}>
            <div className="img-wrapper">
              <img src={assets.blog5} alt="Nutrition" />
            </div>
            <div className="content-wrapper">
              <div className="category">Nutrition</div>
              <h2>Understanding Nutrition Labels: A Guide to Better Eating</h2>
              <div className="meta-wrapper">
                <span>
                  <img src={assets.admin} alt="Admin" />
                  <p>Dr. Emily Johnson</p>
                </span>
                <button>Read More <FaArrowRight size={10} /></button>
              </div>
            </div>
          </Card>
          
          <Card onClick={() => handleBlogClick("The Importance of Mental Health in Everyday Life", "Wellness", "Dr. Michael Lee", assets.blog2)}>
            <div className="img-wrapper">
              <img src={assets.blog2} alt="Mental Health" />
            </div>
            <div className="content-wrapper">
              <div className="category">Wellness</div>
              <h2>The Importance of Mental Health in Everyday Life</h2>
              <div className="meta-wrapper">
                <span>
                  <img src={assets.admin} alt="Admin" />
                  <p>Dr. Michael Lee</p>
                </span>
                <button>Read More <FaArrowRight size={10} /></button>
              </div>
            </div>
          </Card>
        </Slider>
      </Container>
    </Section>
  );
};

export default Blogs;
