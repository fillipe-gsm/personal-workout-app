import { el } from './ui.js'
import { route, start } from './router.js'
import './styles.css'
import { exercisesScreen } from './screens/exercises.js'
import { plansScreen, planEditScreen } from './screens/plans.js'
import { workoutScreen } from './screens/workout.js'
import { historyScreen } from './screens/history.js'
import { profilesScreen } from './screens/profiles.js'
import { plateCalcScreen } from './screens/platecalc.js'

const app = document.querySelector('#app')

route('/', () => homeScreen())
route('/exercises', () => exercisesScreen())
route('/plans', () => plansScreen())
route('/plan/:id', (p) => planEditScreen(p))
route('/workout/:id', (p) => workoutScreen(p))
route('/history/:id', (p) => historyScreen(p))
route('/profiles', () => profilesScreen())
route('/plates', (p, q) => plateCalcScreen(p, q))

function homeScreen() {
  const items = [
    ['🏋️ Exercises', '#/exercises'],
    ['📋 Workout Plans', '#/plans'],
    ['⚖️ Weight Profiles', '#/profiles']
  ]
  return el(
    'div',
    { class: 'screen' },
    el('h1', { class: 'title' }, 'Workout Tracker'),
    el('nav', { class: 'menu' }, items.map(([label, href]) => el('a', { class: 'menu-item', href }, label)))
  )
}

start(app)
