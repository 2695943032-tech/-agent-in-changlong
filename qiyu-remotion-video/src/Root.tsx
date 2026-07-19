import React from 'react';
import {Composition} from 'remotion';
import {QiyuPromo} from './QiyuPromo';
import {QiyuTitleMotion} from './QiyuTitleMotion';
import {QiyuFireflyCorrected} from './QiyuFireflyCorrected';
import {QiyuThinMetallic} from './QiyuThinMetallic';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="QiyuPromo"
        component={QiyuPromo}
        durationInFrames={2280}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="QiyuTitleMotion"
        component={QiyuTitleMotion}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="QiyuFireflyCorrected"
        component={QiyuFireflyCorrected}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="QiyuThinMetallic"
        component={QiyuThinMetallic}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
