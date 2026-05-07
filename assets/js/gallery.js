document.addEventListener('DOMContentLoaded', function () {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const lightboxBackdrop = document.getElementById('lightbox-backdrop');

    const cards = Array.from(document.querySelectorAll('.gallery-card'));
    let currentIndex = -1;

    function openLightbox(index) {
        if (index < 0 || index >= cards.length) return;
        currentIndex = index;
        const src = cards[index].dataset.src;
        if (!src) return;
        lightboxImg.src = src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateCounter();
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        currentIndex = -1;
    }

    function showPrev() {
        if (currentIndex > 0) {
            openLightbox(currentIndex - 1);
        }
    }

    function showNext() {
        if (currentIndex < cards.length - 1) {
            openLightbox(currentIndex + 1);
        }
    }

    function updateCounter() {
        if (lightboxCounter) {
            lightboxCounter.textContent = (currentIndex + 1) + ' / ' + cards.length;
        }
    }

    // Click on gallery cards
    cards.forEach(function (card, index) {
        card.addEventListener('click', function () {
            openLightbox(index);
        });
    });

    // Lightbox controls
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxBackdrop.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', function (e) {
        e.stopPropagation();
        showPrev();
    });
    lightboxNext.addEventListener('click', function (e) {
        e.stopPropagation();
        showNext();
    });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('active')) return;
        switch (e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                showPrev();
                break;
            case 'ArrowRight':
                showNext();
                break;
        }
    });

    // Touch swipe support
    var touchStartX = 0;
    var touchEndX = 0;

    lightbox.addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', function (e) {
        touchEndX = e.changedTouches[0].screenX;
        var diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                showNext();
            } else {
                showPrev();
            }
        }
    }, { passive: true });
});
