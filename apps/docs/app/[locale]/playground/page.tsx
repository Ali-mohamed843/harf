import { Playground } from '../../../components/Playground';
import { BidiPlayground } from '../../../components/BidiPlayground';

export const metadata = { title: 'Playground · Harf' };

export default function PlaygroundPage() {
  return (
    <>
      <h1>Playground</h1>
      <p>
        Both panes render from the same source object. Nothing is duplicated and nothing
        is hand-mirrored — the only difference is the direction passed to{' '}
        <code>resolveStyle</code>.
      </p>

      <h2>Logical styles</h2>
      <Playground />

      <h2>Bidi isolation</h2>
      <p>
        An LTR run inside an RTL sentence reorders at its boundaries. Type below, or pick
        one of the samples, and compare the panes.
      </p>
      <BidiPlayground />
    </>
  );
}
