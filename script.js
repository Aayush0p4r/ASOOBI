document.addEventListener('DOMContentLoaded', function() {
    // Loading Screen
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 3000);

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
        '.card, .section-title, .hero-headline, .hero-subtext, .btn-explore, .step-card, .circle-text, .float-item'
    );

    animatedElements.forEach((el, index) => {
        // Stagger animations slightly
        el.style.transitionDelay = `${index * 0.05}s`;
        
        // Add animation class based on element type or position
        if (el.classList.contains('section-title')) {
            el.classList.add('fade-in-up');
        } else if (el.classList.contains('float-item')) {
            el.classList.add('fade-in');
        } else if (index % 2 === 0) {
            el.classList.add('slide-in-left');
        } else {
            el.classList.add('slide-in-right');
        }
        
        observer.observe(el);
    });
});
