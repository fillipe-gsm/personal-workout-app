import './styles.css'
import { route, start } from './router.js'
import './components/home-menu.js'
import './components/exercise-list.js'
import './components/plans.js'
import './components/workout-session.js'
import './components/exercise-history.js'
import './components/profiles.js'
import './components/plate-calculator.js'

function create(tag, attrs = {}) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (value != null) node.setAttribute(key, value)
  }
  return node
}

route('/', () => create('home-menu'))
route('/exercises', () => create('exercise-list'))
route('/plans', () => create('plan-list'))
route('/plan/:id', (params) => create('plan-edit', { 'plan-id': params.id }))
route('/workout/:id', (params) => create('workout-session', { 'plan-id': params.id }))
route('/history/:id', (params) => create('exercise-history', { 'exercise-id': params.id }))
route('/profiles', () => create('profile-list'))
route('/plates', (params, query) =>
  create('plate-calculator', { weight: query.weight, 'profile-id': query.profile })
)

start(document.querySelector('#app'))
