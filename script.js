document.addEventListener('DOMContentLoaded', function() {
    // Loading Screen
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 3000);

    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navbar = document.querySelector('.navbar');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('mobile-menu-active');
            navbar.classList.toggle('menu-open');
            // Toggle icon
            this.textContent = navLinks.classList.contains('mobile-menu-active') ? '✕' : '☰';
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navbar.contains(event.target) && navLinks.classList.contains('mobile-menu-active')) {
                navLinks.classList.remove('mobile-menu-active');
                navbar.classList.remove('menu-open');
                mobileMenuToggle.textContent = '☰';
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                navLinks.classList.remove('mobile-menu-active');
                navbar.classList.remove('menu-open');
                mobileMenuToggle.textContent = '☰';
            });
        });
    }

    // Scroll Animations using Intersection Observer
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: unobserve after animation triggers once
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Target elements for scroll animations
    const animatedElements = document.querySelectorAll(
        '.card, .section-title, .hero-headline, .hero-subtext, .btn-explore, .step-card, .circle-text, .float-item, .testimonial-card, .testimonials-title'
    );

    animatedElements.forEach((el, index) => {
        // Stagger animations slightly
        el.style.transitionDelay = `${index * 0.05}s`;
        
        // Add animation class based on element type or position
        if (el.classList.contains('section-title') || el.classList.contains('testimonials-title')) {
            el.classList.add('fade-in-up');
        } else if (el.classList.contains('float-item')) {
            el.classList.add('fade-in');
        } else if (el.classList.contains('testimonial-card')) {
            el.classList.add('slide-in-up');
        } else if (index % 2 === 0) {
            el.classList.add('slide-in-left');
        } else {
            el.classList.add('slide-in-right');
        }
        
        observer.observe(el);
    });
});
