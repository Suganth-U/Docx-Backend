import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import Footer from "@/shared/components/layout/Footer/Footer";
import { assets } from "@/shared/lib/assets";
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaLink, FaArrowLeft, FaArrowRight } from "react-icons/fa";

const PageContainer = styled.div`
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  background-color: #fff;
`;

const FullPageLoader = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #fff;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  font-family: 'Inter', sans-serif;

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(142, 36, 170, 0.2);
    border-top: 4px solid #8e24aa;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  p {
    color: #555;
    font-size: 16px;
    font-weight: 500;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const DetailSection = styled.section`
  max-width: 1400px;
  margin: 0 auto;
  padding: 100px 5% 80px;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 60px;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const MetaTop = styled.div`
  font-size: 13px;
  color: #666;
  font-weight: 500;
  margin-bottom: 20px;
  
  span {
    color: #000;
    font-weight: 600;
  }
`;

const Title = styled.h1`
  font-size: 54px;
  font-weight: 800;
  color: #111;
  line-height: 1.1;
  margin-bottom: 25px;
  font-family: 'Inter', sans-serif;
  letter-spacing: -1px;

  @media (max-width: 768px) {
    font-size: 38px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: #555;
  line-height: 1.6;
  margin-bottom: 40px;
`;

const HeroImage = styled.div`
  width: 100%;
  height: 500px;
  overflow: hidden;
  margin-bottom: 30px;
  background: #f0f0f0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 768px) {
    height: 300px;
  }
`;

const Tags = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 50px;
  flex-wrap: wrap;

  span {
    padding: 8px 18px;
    border: 1px solid #ddd;
    border-radius: 30px;
    font-size: 13px;
    font-weight: 600;
    color: #333;
    text-transform: capitalize;
    transition: all 0.2s;
    cursor: pointer;

    &:hover {
      border-color: #8e24aa;
      color: #8e24aa;
    }
  }
`;

const ContentBody = styled.div`
  font-size: 17px;
  line-height: 1.8;
  color: #333;

  h3 {
    font-size: 28px;
    color: #111;
    margin: 40px 0 20px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  p {
    margin-bottom: 25px;
    color: #444;
  }

  ul, ol {
    margin-bottom: 25px;
    padding-left: 20px;
    li {
      margin-bottom: 10px;
    }
  }
`;

const Sidebar = styled.aside`
  background-color: #f8f9fa;
  padding: 40px;
  border-radius: 12px;
  position: sticky;
  top: 100px;
  display: flex;
  flex-direction: column;
  gap: 40px;

  @media (max-width: 1100px) {
    position: static;
    padding: 30px 20px;
  }
`;

const AuthorCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 30px;
  border-bottom: 1px solid #e0e0e0;

  .author-info {
    display: flex;
    align-items: center;
    gap: 15px;

    img {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
    }

    div {
      h4 {
        margin: 0 0 4px 0;
        font-size: 16px;
        color: #111;
      }
      p {
        margin: 0;
        font-size: 13px;
        color: #777;
      }
    }
  }

  .socials {
    display: flex;
    gap: 10px;
    
    button {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid #ddd;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #555;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: #8e24aa;
        color: #8e24aa;
      }
    }
  }
`;

const PopularPosts = styled.div`
  h4 {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 20px;
    color: #111;
  }

  .post-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .post-item {
    display: flex;
    gap: 15px;
    cursor: pointer;
    group: hover;

    img {
      width: 90px;
      height: 70px;
      border-radius: 8px;
      object-fit: cover;
    }

    div {
      flex: 1;
      h5 {
        font-size: 14px;
        line-height: 1.4;
        margin: 0 0 5px 0;
        color: #111;
        transition: color 0.2s;
      }
      span {
        font-size: 12px;
        color: #777;
      }
    }

    &:hover h5 {
      color: #8e24aa;
    }
  }
`;

const ArticleNav = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 15px;

  button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px;
    border-radius: 30px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    
    &.prev {
      background: #fff;
      border: 1px solid #ddd;
      color: #333;
      &:hover { border-color: #aaa; }
    }
    
    &.next {
      background: #5c27f2;
      border: 1px solid #5c27f2;
      color: #fff;
      &:hover { background: #4a1bbd; }
    }
  }
`;

const BlogDetail = () => {
  const { title } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [allBlogs, setAllBlogs] = useState([]);
  const [popularBlogs, setPopularBlogs] = useState([]);

  const blogTitle = decodeURIComponent(title).replace(/-/g, " ");
  const blogCategory = location.state?.category || "General Health";
  const blogAuthor = location.state?.authorName || "Joshua Nash";
  const blogImg = location.state?.img || assets.blog1;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  useEffect(() => {
    window.scrollTo(0, 0);
    const generateContent = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/cms/blogs/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: blogTitle, category: blogCategory }),
        });
        const data = await res.json();
        if (data.content) {
          setContent(data.content);
        } else {
          setContent("<p>Failed to generate content. Please try again later.</p>");
        }
      } catch (error) {
        console.error("Error generating blog:", error);
        setContent("<p>An error occurred while generating the blog post. Please check your connection.</p>");
      } finally {
        setLoading(false);
      }
    };

    const fetchPopular = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/cms/blogs");
        const data = await res.json();
        setAllBlogs(data);
        setPopularBlogs(data.slice(0, 3));
      } catch (err) {
        const fallback = [
          { title: "From Traditional Banking to Digital Disruption", category: "Innovation", authorName: "John Wright", date: dateStr, img: assets.blog3 },
          { title: "Building a Better Financial Future Today", category: "Wellness", authorName: "Joshua Nash", date: dateStr, img: assets.blog2 },
        ];
        setAllBlogs(fallback);
        setPopularBlogs(fallback);
      }
    };

    setLoading(true);
    generateContent();
    fetchPopular();
  }, [blogTitle, blogCategory, dateStr]);

  const currentIndex = allBlogs.findIndex(b => b.title === blogTitle);
  const prevArticle = currentIndex > 0 ? allBlogs[currentIndex - 1] : allBlogs[allBlogs.length - 1];
  const nextArticle = currentIndex >= 0 && currentIndex < allBlogs.length - 1 ? allBlogs[currentIndex + 1] : allBlogs[0];

  const handleNav = (article) => {
    if (!article) {
      navigate('/blog');
      return;
    }
    const slug = encodeURIComponent(article.title.replace(/\\s+/g, '-'));
    navigate(`/blog/${slug}`, { state: { ...article, img: article.image || article.img || assets.blog1 } });
  };

  if (loading) {
    return (
      <FullPageLoader>
        <div className="spinner"></div>
        <p>Loading article content...</p>
      </FullPageLoader>
    );
  }

  return (
    <PageContainer>
      <Navigationbar />
      <DetailSection>
        
        <MainContent>
          <MetaTop>
            {dateStr}, by <span>{blogAuthor}</span>
          </MetaTop>
          
          <Title>{blogTitle}</Title>
          
          <Subtitle>
            Discover the insights and latest research regarding {blogCategory.toLowerCase()}. Learn how these breakthroughs can accelerate your journey to better health.
          </Subtitle>

          <HeroImage>
            <img src={blogImg} alt={blogTitle} />
          </HeroImage>

          <Tags>
            <span>{blogCategory}</span>
            <span>Health</span>
            <span>News</span>
          </Tags>

          <ContentBody dangerouslySetInnerHTML={{ __html: content }} />
        </MainContent>

        <Sidebar>
          <AuthorCard>
            <div className="author-info">
              <img src={assets.admin} alt={blogAuthor} />
              <div>
                <h4>{blogAuthor}</h4>
                <p>Author</p>
              </div>
            </div>
            <div className="socials">
              <button><FaTwitter size={12} /></button>
              <button><FaFacebookF size={12} /></button>
              <button><FaLinkedinIn size={12} /></button>
              <button><FaLink size={12} /></button>
            </div>
          </AuthorCard>

          <ArticleNav>
            <button className="prev" onClick={() => handleNav(prevArticle)}><FaArrowLeft size={10} /> Previous</button>
            <button className="next" onClick={() => handleNav(nextArticle)}>Next article <FaArrowRight size={10} /></button>
          </ArticleNav>

          <PopularPosts>
            <h4>Popular post</h4>
            <div className="post-list">
              {popularBlogs.map((b, i) => (
                <div key={i} className="post-item" onClick={() => navigate(`/blog/${encodeURIComponent((b.title).replace(/\\s+/g, '-'))}`, { state: { ...b, img: b.image || b.img || assets.blog1 } })}>
                  <img src={b.image || b.img || assets.blog1} alt="Post" />
                  <div>
                    <span>{dateStr}, by {b.authorName || "John Wright"}</span>
                    <h5>{b.title}</h5>
                  </div>
                </div>
              ))}
            </div>
          </PopularPosts>
        </Sidebar>

      </DetailSection>
      <Footer />
    </PageContainer>
  );
};

export default BlogDetail;
