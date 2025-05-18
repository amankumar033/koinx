// pages/api/capitalGains.ts
import type { NextApiRequest, NextApiResponse } from 'next';

interface CapitalGainsData {
  capitalGains: {
    stcg: {
      profits: number;
      losses: number;
    };
    ltcg: {
      profits: number;
      losses: number;
    };
  };
}

const capitalGainsData: CapitalGainsData = {
  capitalGains: {
    stcg: {
      profits: 70200.88,
      losses: 1548.53
    },
    ltcg: {
      profits: 5020,
      losses: 3050
    },
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json(capitalGainsData);
}
