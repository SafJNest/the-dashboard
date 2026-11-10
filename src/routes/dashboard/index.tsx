import { component$ } from '@qwik.dev/core';

export default component$(() => (
  <main>
    <h1>Dashboard</h1>
    <p>Qwik 2 is working</p>
    <form>
      <label><input type="checkbox" name="enabled" /> Enable</label>
      <button type="submit">Submit</button>
    </form>
  </main>
));
