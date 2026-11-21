import { Skeleton } from '../skeleton/skeleton';

const PLACEHOLDERS = Array.from({ length: 6 }, (_, index) => index);
const TAGS = Array.from({ length: 4 }, (_, index) => index);
const FACTS = ['Plays', 'Listeners', 'Liked by'];
const ROW_WIDTH_MIN = 45;
const ROW_WIDTH_STEP = 17;
const ROW_WIDTH_RANGE = 35;

export function RowsSkeleton({ label }: { label: string }) {
  return (
    <>
      <span class="visually-hidden" role="status">{label}</span>
      {PLACEHOLDERS.map((row) => (
        <div key={row} class="catalog-row" aria-hidden="true">
          <Skeleton width="1.75rem" height="1.75rem" />
          <Skeleton width="3rem" height="3rem" />
          <span class="catalog-row__main">
            <Skeleton width={`${ROW_WIDTH_MIN + ((row * ROW_WIDTH_STEP) % ROW_WIDTH_RANGE)}%`} />
            <Skeleton width="30%" height="0.5rem" />
          </span>
          <Skeleton width="4rem" height="0.5rem" />
        </div>
      ))}
    </>
  );
}

export function TilesSkeleton() {
  return (
    <div class="catalog-grid" aria-busy="true">
      <span class="visually-hidden" role="status">Loading trending sounds</span>
      {PLACEHOLDERS.map((tile) => (
        <div key={tile} class="catalog-tile" aria-hidden="true">
          <span class="sound-thumb sound-thumb--fill" />
          <Skeleton width="70%" />
          <Skeleton width="45%" height="0.5rem" />
        </div>
      ))}
    </div>
  );
}

export function TagsSkeleton() {
  return (
    <div class="catalog-filters__tags" aria-busy="true">
      <span class="visually-hidden" role="status">Loading tags</span>
      {TAGS.map((tag) => <Skeleton key={tag} width="4.5rem" height="2rem" />)}
    </div>
  );
}

export function FactsSkeleton() {
  return (
    <dl class="catalog-facts" aria-busy="true">
      {FACTS.map((label) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd><Skeleton width="3ch" height="1.25rem" /></dd>
        </div>
      ))}
    </dl>
  );
}

export function PanelSkeleton() {
  return (
    <div class="catalog-panel__body" aria-busy="true">
      <span class="visually-hidden" role="status">Loading sound</span>
      <div class="sound-card__head" aria-hidden="true">
        <Skeleton width="5.5rem" height="5.5rem" />
        <div class="sound-card__meta">
          <Skeleton width="60%" height="1.75rem" />
          <Skeleton width="40%" />
        </div>
      </div>
      <Skeleton width="100%" height="3rem" />
      <Skeleton width="70%" height="2.25rem" />
    </div>
  );
}

export function CommentsSkeleton() {
  return (
    <section class="comments" aria-busy="true">
      <span class="visually-hidden" role="status">Loading comments</span>
      <Skeleton width="8rem" height="1rem" />
      <Skeleton width="100%" height="3.5rem" />
      <Skeleton width="80%" />
      <Skeleton width="60%" />
    </section>
  );
}

export function CreatorSkeleton() {
  return (
    <div class="creator-hero__id" aria-busy="true">
      <span class="visually-hidden" role="status">Loading creator</span>
      <Skeleton width="6rem" height="6rem" />
      <div class="sound-card__meta" aria-hidden="true">
        <Skeleton width="8rem" height="0.625rem" />
        <Skeleton width="14rem" height="2.25rem" />
      </div>
    </div>
  );
}
