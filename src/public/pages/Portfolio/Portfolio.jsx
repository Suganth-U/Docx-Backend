import React, { useEffect } from "react";
import { assets } from "@/shared/lib/assets";
import { Navigationbar } from "@/shared/components/layout/NavigationBar/Navigationbar";
import "@/public/pages/Portfolio/Portfolio.css";
import AOS from "aos";
import Footer from "@/shared/components/layout/Footer/Footer";
import { Link } from "react-router-dom";

const Portfolio = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.init({ duration: 1000 });
  })
  return (

    <>
      <Navbar />
      <section className="portfolio-main" data-aos="fade-up">
        <div className="portfolio-header" data-aos="fade-up" data-aos-delay="100">
          <h1>Portfolio</h1>
          <div className="icon-container">
            <Link to="/"><img src={assets.HomeIcon} alt="Home" /></Link>
            <img src={assets.rightArrow} alt="About"></img>
            <h2 data-aos="zoom-in">Portfolio</h2>
          </div>
        </div>
      </section>


      <Footer />
    </>
  )
}

export default Portfolio