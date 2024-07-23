document.querySelectorAll('.load-image').forEach(button => {
    button.addEventListener('click', function () {
        const img = document.createElement('img');
        img.src = this.dataset.src;
        this.replaceWith(img);
    });
});
document.getElementById('increase-font').addEventListener('click', function () {
    document.body.style.fontSize = (parseFloat(getComputedStyle(document.body).fontSize) + 1) + 'px';
});

document.getElementById('decrease-font').addEventListener('click', function () {
    document.body.style.fontSize = (parseFloat(getComputedStyle(document.body).fontSize) - 1) + 'px';
});

document.getElementById('toggle-contrast').addEventListener('click', function () {
    if (document.body.classList.contains('dark')) {
        document.body.classList.remove('dark');
        document.querySelector('.sidebar').classList.remove('dark');
        document.querySelector('.search-bar').classList.remove('dark');
        localStorage && localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.add('dark');
        document.querySelector('.sidebar').classList.add('dark');
        document.querySelector('.search-bar').classList.add('dark');
        localStorage && localStorage.setItem('theme', 'dark');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage?.getItem('theme')) {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark');
            document.querySelector('.sidebar').classList.add('dark');
            document.querySelector('.search-bar').classList.add('dark');
        }
    }else{
        const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (darkMode) {
            document.body.classList.add('dark');
            document.querySelector('.sidebar').classList.add('dark');
            document.querySelector('.search-bar').classList.add('dark');
        }
    }
});