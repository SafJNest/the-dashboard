export function PageSkeleton() {
  return (
    <div class="container page-skeleton" aria-busy="true">
      <span class="visually-hidden" role="status">Loading</span>
      <span class="skeleton" style={{ '--skeleton-width': '30%', '--skeleton-height': '2rem' }} aria-hidden="true" />
      <span class="skeleton" style={{ '--skeleton-width': '55%' }} aria-hidden="true" />
      <span class="skeleton" style={{ '--skeleton-height': '16rem' }} aria-hidden="true" />
    </div>
  );
}
