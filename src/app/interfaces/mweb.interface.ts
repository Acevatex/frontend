// Types match the mwebexplorer JSON surface served by litecoinspace.org/api/v1/mweb/*

export interface MwebApiError {
  error: {
    code: 'not_found' | 'bad_request' | 'unavailable' | 'internal' | string;
    message: string;
    request_id?: string;
  };
}

export interface MwebHealth {
  status: 'ready' | 'not_ready';
  probe_type: 'readiness';
  reason?: string;
  note?: string;
}

export interface MwebSyncStatus {
  indexed: boolean;
  tip_hash?: string;
  tip_height?: number;
  note?: string;
}

export interface MwebHogExPeginInput {
  hogexVinIndex: number;
  prevTxHash: string;
  prevVoutIndex: number;
  sequence: number;
  resolvedValue: number;
  resolvedKernelId?: string;
}

export interface MwebHogExPegoutOutput {
  hogexVoutIndex: number;
  value: number;
  pkScriptHex: string;
  addressClass: string;
  addresses: string[];
  matchedKernel?: { kernelIdx: number; pegoutIdx: number };
}

export interface MwebHogEx {
  txHash: string;
  txIndex: number;
  serializedSize: number;
  hogAddr: {
    pkScriptHex: string;
    headerHash: string;
    value: number;
    matchesMwebHeader: boolean;
  };
  peginInputs: MwebHogExPeginInput[];
  pegoutOutputs: MwebHogExPegoutOutput[];
  sumInputs: number;
  sumOutputs: number;
  fee: number;
}

export interface MwebCanonicalPegin {
  sourceTxIndex: number;
  sourceTxHash: string;
  sourceVoutIndex: number;
  value: number;
  kernelId: string;
  pkScriptHex: string;
  kernelMatched: boolean;
  matchedKernelIdx?: number;
}

export interface MwebHeader {
  headerHash: string;
  height: number;
  outputRoot: string;
  kernelRoot: string;
  leafsetRoot: string;
  kernelOffset: string;
  stealthOffset: string;
  outputMMRSize: number;
  kernelMMRSize: number;
}

export interface MwebSupplySnapshot {
  currentLitoshi: number;
  previousLitoshi: number;
  deltaLitoshi: number;
  allTimeOutputCount: number;
}

export interface MwebKernelPegoutSlot {
  index: number;
  value: number;
  pkScriptHex: string;
  addressClass?: string;
  addresses?: string[];
  hogExMatch?: { hogExVoutIndex: number };
}

export interface MwebKernel {
  index: number;
  kernelId: string;
  leafIndex?: number;
  leafNodePosition?: number;
  leafHash?: string;
  features: number;
  featureFlags: string[];
  fee?: number;
  pegin?: number;
  pegouts?: MwebKernelPegoutSlot[];
  excessHex: string;
  signatureHex: string;
  lockHeightEnforced?: boolean;
}

export interface MwebInput {
  index: number;
  inputHash: string;
  features: number;
  featureFlags?: string[];
  outputId: string;
  commitmentHex: string;
  outputPubKeyHex?: string;
  inputPubKeyHex?: string;
  extraDataHex?: string;
  signatureHex?: string;
  spendsFrozen?: boolean;
}

export interface MwebOutput {
  index: number;
  outputId: string;
  leafIndex?: number;
  leafNodePosition?: number;
  leafHash?: string;
  commitmentHex: string;
  senderPubKeyHex?: string;
  receiverPubKeyHex?: string;
  message?: {
    features: number;
    keyExchangePubKeyHex?: string;
    viewTag?: number;
    maskedValue?: number;
    maskedNonceHex?: string;
  };
  rangeProofHashHex?: string;
  hasRangeProof?: boolean;
  signatureHex?: string;
  stealthAddress?: string;
}

export interface MwebSection {
  headerHash: string;
  header: MwebHeader;
  inputCount: number;
  outputCount: number;
  kernelCount: number;
  totalPeginAmount: number;
  totalPegoutAmount: number;
  pegoutCount: number;
  totalFees: number;
  supplyChange: number;
  supply: MwebSupplySnapshot;
  headerBytes: number;
  bodyBytes: number;
  weight: number;
  weightCap: number;
  kernels: MwebKernel[];
  inputs: MwebInput[];
  outputs: MwebOutput[];
}

export interface MwebBlockReport {
  blockHash: string;
  version: number;
  versionHex: string;
  mwebPresent: boolean;
  prevBlock: string;
  merkleRoot: string;
  time: number;
  bits: number;
  nonce: number;
  canonicalHeight: number;
  serializedSize: number;
  strippedSize: number;
  witnessSize: number;
  mwebSectionSize: number;
  canonicalTxCount: number;
  canonicalPegins?: MwebCanonicalPegin[];
  hogEx?: MwebHogEx;
  mweb?: MwebSection;
  findings?: unknown[];
  blockLocalAnalysis?: unknown;
}

export interface MwebCoverage {
  block_height: number;
  attributed_kernels: number;
  total_kernels: number;
  attributed_inputs: number;
  total_inputs: number;
  attributed_outputs: number;
  total_outputs: number;
}

export interface MwebMempoolBroadcast {
  MempoolTxID: string;
  IsSynthetic: boolean;
  KernelOffset?: string;
  StealthOffset?: string;
  Fee?: number;
  ObservedAt?: string;
  Status: 'pending' | 'confirmed' | 'degraded' | 'direct_to_block' | string;
  ConfirmedAt?: number | null;
  RawTx?: string;
  KernelIDs?: string[];
  OutputIDs?: string[];
  SpentOutputIDs?: string[];
  MissingOutputIDs?: string[] | null;
  MissingSpentIDs?: string[] | null;
}

export interface MwebBlockResponse {
  block: MwebBlockReport;
  coverage: MwebCoverage;
  broadcasts: MwebMempoolBroadcast[];
  broadcasts_truncated: boolean;
  broadcasts_next_cursor: string;
}

export interface MwebOutputView {
  output: MwebOutput;
  blockHash: string;
  blockHeight: number;
  blockTime: number;
  spentAtHeight?: number;
  spentByInputIdx?: number;
}

export interface MwebOutputSpend {
  outputId: string;
  input: MwebInput;
  blockHash: string;
  blockHeight: number;
}

export interface MwebBroadcastsPage {
  items: MwebMempoolBroadcast[];
  next_cursor: string;
  page_size: number;
  coverage?: MwebCoverage;
}

export interface MwebKernelLookup {
  kernelId: string;
  tier1?: {
    kernel: MwebKernel;
    blockHash: string;
    blockHeight: number;
    blockTime: number;
    sourcePegin?: MwebCanonicalPegin;
    sinkPegouts?: unknown[];
    publicBridge?: unknown;
    findings?: unknown[];
  };
  tier2?: {
    sisterKernelIds?: string[];
    outputSpends?: { outputId: string; spentAtHeight: number; spentByInputIdx: number }[];
  };
  tier3?: {
    mempoolTxId?: string;
    isSynthetic?: boolean;
    status?: string;
    sisterKernelIds?: string[];
    outputIds?: string[];
    spentOutputIds?: string[];
    kernelOffset?: string;
    stealthOffset?: string;
    observedAt?: string;
    confirmedAtHeight?: number;
    blockHash?: string;
    fee?: number;
  };
  notes?: string[];
}

export interface MwebMempoolPage {
  items: MwebMempoolBroadcast[];
  next_cursor: string;
  page_size: number;
}

export interface MwebAddressCluster {
  address: string;
  pegoutCount: number;
  totalValue: number;
  firstSeenHeight: number;
  lastSeenHeight: number;
  heightSpan: number;
  notes: string[];
}

export type MwebStatsRange = '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '3y' | 'all';

export interface MwebBlocksListItem {
  block_hash: string;
  block_height: number;
  block_time_unix: number;
  kernel_count: number;
  pegin_count: number;
  pegout_count: number;
  mweb_input_count: number;
  mweb_output_count: number;
  pegin_amount: number;
  pegout_amount: number;
  fees_total: number;
  supply_litoshi: number;
  delta_litoshi: number;
  mweb_section_size: number;
}

export interface MwebBlocksListPage {
  items: MwebBlocksListItem[];
  page_size: number;
  next_cursor: number | null;
  has_more: boolean;
  as_of_height: number;
}

export interface MwebBlocksCount {
  count: number;
  as_of_height: number;
}

export interface MwebSeriesBucket {
  t: number;
  mweb_block_count: number;
  kernel_count: number;
  pegin_count: number;
  pegout_count: number;
  mweb_input_count: number;
  mweb_output_count: number;
  pegin_amount: number;
  pegout_amount: number;
  fees_total: number;
  delta_litoshi: number;
  supply_end_litoshi: number;
}

export interface MwebStatsSeries {
  range?: MwebStatsRange;
  bucket_seconds: number;
  from_unix: number;
  to_unix: number;
  as_of_height: number;
  as_of_unix: number;
  buckets: MwebSeriesBucket[];
}

export interface MwebStatsNow extends MwebSeriesBucket {
  range: MwebStatsRange;
  bucket_seconds: number;
  partial: boolean;
  as_of_height: number;
  as_of_unix: number;
}
