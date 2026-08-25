export class HomeMenu extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="screen">
        <h1 class="title">Workout Tracker</h1>
        <nav class="menu">
          <a class="menu-item" href="#/exercises">🏋️ Exercises</a>
          <a class="menu-item" href="#/plans">📋 Workout Plans</a>
          <a class="menu-item" href="#/profiles">⚖️ Weight Profiles</a>
        </nav>
      </div>`
  }
}

if (!customElements.get('home-menu')) customElements.define('home-menu', HomeMenu)
