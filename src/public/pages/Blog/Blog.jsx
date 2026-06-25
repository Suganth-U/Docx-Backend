import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { assets } from "@/shared/lib/assets";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import AOS from "aos";
import "aos/dist/aos.css";
import Footer from "@/shared/components/layout/Footer/Footer";
import styled from "styled-components";
import { FaArrowRight } from "react-icons/fa";

const PageContainer = styled.div`
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  background-color: #f8f9fa;
`;

const BlogSection = styled.section`
  max-width: 1300px;
  margin: 0 auto;
  padding: 120px 5% 80px;
  display: flex;
  flex-direction: column;
  gap: 60px;
`;

const PageHeader = styled.div`
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
  
  h1 {
    font-size: 48px;
    font-weight: 800;
    color: #111;
    line-height: 1.2;
    margin-bottom: 20px;
    letter-spacing: -1px;
  }
  
  p {
    font-size: 18px;
    color: #555;
    line-height: 1.7;
    margin-bottom: 30px;
  }
`;

const FeaturedArticle = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 40px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 15px 50px rgba(0,0,0,0.05);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s ease;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 25px 60px rgba(142, 36, 170, 0.15);
    border-color: rgba(142, 36, 170, 0.3);
  }

  .featured-img {
    width: 100%;
    height: 100%;
    min-height: 400px;
    object-fit: cover;
  }

  .featured-content {
    padding: 50px 40px 50px 0;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .category {
      color: #8e24aa;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 20px;
      background: rgba(243, 229, 245, 0.8);
      padding: 8px 16px;
      border-radius: 20px;
      align-self: flex-start;
    }

    h2 {
      font-size: 36px;
      font-weight: 800;
      color: #111;
      line-height: 1.3;
      margin-bottom: 20px;
      letter-spacing: -0.5px;
      transition: color 0.3s;
    }

    p {
      font-size: 16px;
      color: #555;
      line-height: 1.6;
      margin-bottom: 30px;
    }

    .meta {
      margin-top: auto;
      display: flex;
      align-items: center;
      gap: 15px;

      img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
      }

      .author-info {
        display: flex;
        flex-direction: column;
        
        span {
          font-weight: 600;
          color: #111;
        }
        small {
          color: #777;
          font-size: 13px;
        }
      }
    }
  }

  &:hover h2 {
    color: #8e24aa;
  }

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
    .featured-img { height: 300px; min-height: auto; }
    .featured-content { padding: 30px; }
  }
`;

const SectionTitle = styled.h3`
  font-size: 28px;
  font-weight: 800;
  color: #111;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid #eaeaea;
`;

const ArticlesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ArticleCard = styled.div`
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

  &:hover {
    transform: translateY(-12px);
    box-shadow: 0 20px 50px rgba(142, 36, 170, 0.15);
    border-color: rgba(142, 36, 170, 0.3);
  }

  .image-wrapper {
    width: 100%;
    height: 220px;
    overflow: hidden;
    position: relative;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s;
    }
  }
  
  &:hover .image-wrapper img {
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
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 15px;
    background: rgba(243, 229, 245, 0.8);
    padding: 6px 14px;
    border-radius: 20px;
    align-self: flex-start;
  }
  
  h3 {
    font-size: 20px;
    font-weight: 700;
    color: #111;
    line-height: 1.4;
    margin: 0 0 15px 0;
    transition: color 0.3s;
  }

  &:hover h3 {
    color: #8e24aa;
  }

  p.excerpt {
    font-size: 14px;
    color: #666;
    line-height: 1.6;
    margin-bottom: 20px;
    flex: 1;
  }

  .meta {
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 20px;
    border-top: 1px solid rgba(0,0,0,0.05);

    .author {
      display: flex;
      align-items: center;
      gap: 10px;
      
      img {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        object-fit: cover;
      }

      span {
        font-size: 13px;
        color: #333;
        font-weight: 600;
      }
    }

    .read-more {
       color: #8e24aa;
       font-weight: 600;
       display: flex;
       align-items: center;
       gap: 5px;
       font-size: 13px;
       transition: gap 0.2s;
    }
  }

  &:hover .read-more {
    gap: 8px;
  }
`;

const Blog = () => {
  const [articles, setArticles] = useState([]);
  const navigate = useNavigate();

  const handleBlogClick = (article) => {
    const slug = encodeURIComponent(article.title.replace(/\\s+/g, '-'));
    navigate(`/blog/${slug}`, { state: article });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.init({ duration: 1000 });

    const fetchBlogs = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/cms/blogs");
        const data = await res.json();
        if (data.length > 0) {
          setArticles(data.map(b => ({
            img: b.image || assets.blog1,
            category: b.category,
            title: b.title,
            authorName: b.authorName
          })));
        } else {
          // Fallback static data
          setArticles([
            { img: assets.blog1, category: "INNOVATION", title: "The Future of Telemedicine: Healthcare at Your Fingertips", authorName: "Dr. Sarah Smith" },
            { img: assets.blog2, category: "MENTAL HEALTH", title: "Understanding Anxiety: Signs, Symptoms, and Management", authorName: "Dr. Richard James" },
            { img: assets.blog3, category: "NUTRITION", title: "10 Superfoods to Boost Your Immune System Naturally", authorName: "Dr. Emily Johnson" },
            { img: assets.blog4, category: "LIFESTYLE", title: "Simple Daily Habits for a Healthier, Longer Life", authorName: "Dr. Michael Chen" },
            { img: assets.blog5, category: "CARDIOLOGY", title: "Heart Health 101: Preventing Cardiovascular Diseases", authorName: "Dr. Sarah Smith" },
            { img: assets.healthcare, category: "TECHNOLOGY", title: "How AI is Revolutionizing Medical Diagnosis", authorName: "Dr. Richard James" }
          ]);
        }
      } catch {
        setArticles([
          { img: assets.blog1, category: "INNOVATION", title: "The Future of Telemedicine: Healthcare at Your Fingertips", authorName: "Dr. Sarah Smith" },
          { img: assets.blog2, category: "MENTAL HEALTH", title: "Understanding Anxiety: Signs, Symptoms, and Management", authorName: "Dr. Richard James" },
          { img: assets.blog3, category: "NUTRITION", title: "10 Superfoods to Boost Your Immune System Naturally", authorName: "Dr. Emily Johnson" },
          { img: assets.blog4, category: "LIFESTYLE", title: "Simple Daily Habits for a Healthier, Longer Life", authorName: "Dr. Michael Chen" },
          { img: assets.blog5, category: "CARDIOLOGY", title: "Heart Health 101: Preventing Cardiovascular Diseases", authorName: "Dr. Sarah Smith" },
          { img: assets.healthcare, category: "TECHNOLOGY", title: "How AI is Revolutionizing Medical Diagnosis", authorName: "Dr. Richard James" }
        ]);
      }
    };
    fetchBlogs();
  }, []);

  const featuredIndex = articles.findIndex(a => a.category.toUpperCase() === "TECHNOLOGY" || a.category.toUpperCase() === "NUTRITION");
  const validFeaturedIndex = featuredIndex !== -1 ? featuredIndex : (articles.length > 2 ? 2 : 0);

  const featuredArticle = articles.length > 0 ? articles[validFeaturedIndex] : null;
  const gridArticles = articles.filter((_, idx) => idx !== validFeaturedIndex);
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <PageContainer>
      <Navigationbar />

      <BlogSection>
        <PageHeader data-aos="fade-up">
          <h1>Insights & Articles</h1>
          <p>Stay informed with the latest insights on wellness, medical breakthroughs, and healthy living from our experts.</p>
        </PageHeader>

        {featuredArticle && (
          <FeaturedArticle data-aos="fade-up" onClick={() => handleBlogClick(featuredArticle)}>
            <img src={featuredArticle.img} alt={featuredArticle.title} className="featured-img" />
            <div className="featured-content">
              <span className="category">{featuredArticle.category}</span>
              <h2>{featuredArticle.title}</h2>
              <p>Discover the latest advancements and practical tips regarding {featuredArticle.category.toLowerCase()}. Click to read the full analysis generated by our medical experts.</p>
              
              <div className="meta">
                <img src={assets.admin} alt={featuredArticle.authorName} />
                <div className="author-info">
                  <span>{featuredArticle.authorName}</span>
                  <small>{dateStr}</small>
                </div>
              </div>
            </div>
          </FeaturedArticle>
        )}

        {gridArticles.length > 0 && (
          <div>
            <SectionTitle data-aos="fade-up">Latest Posts</SectionTitle>
            <ArticlesGrid>
              {gridArticles.map((article, index) => (
                <ArticleCard key={index} data-aos="fade-up" data-aos-delay={index * 50} onClick={() => handleBlogClick(article)}>
                  <div className="image-wrapper">
                    <img src={article.img} alt={article.title} />
                  </div>
                  <div className="content-wrapper">
                    <span className="category">{article.category}</span>
                    <h3>{article.title}</h3>
                    <p className="excerpt">Explore insights into {article.category.toLowerCase()} and how it impacts modern living...</p>
                    
                    <div className="meta">
                      <div className="author">
                        <img src={assets.admin} alt="Author" />
                        <span>{article.authorName}</span>
                      </div>
                      <div className="read-more">Read <FaArrowRight size={10} /></div>
                    </div>
                  </div>
                </ArticleCard>
              ))}
            </ArticlesGrid>
          </div>
        )}
      </BlogSection>

      <Footer />
    </PageContainer>
  );
};

export default Blog;
