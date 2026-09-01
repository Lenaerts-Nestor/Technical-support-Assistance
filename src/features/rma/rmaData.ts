import type { IssueCategory, RmaDetailField } from './types'

/**
 * External serial-number lookup opened by the SN Lookup button.
 *
 * PLACEHOLDER — no real internal URL is committed to this repo. Point it at the
 * tool you actually use; until then the button stays disabled.
 */
export const SN_LOOKUP_URL = ''

export const UNIT_PLACEHOLDERS = {
  serial: 'Serial number',
  productName: 'Product name',
} as const

/** The single-value fields, in display and copy order. */
export const DETAIL_FIELDS: {
  id: RmaDetailField
  label: string
  placeholder: string
  /** Multi-line fields span the full width of the form grid. */
  multiline?: boolean
}[] = [
  {
    id: 'issueDescription',
    label: 'Issue Description',
    placeholder: 'Describe the issue… (Enter for new line)',
    multiline: true,
  },
  {
    id: 'projectReference',
    label: 'Project Name / Reference',
    placeholder: 'Project or reference',
  },
  { id: 'companyName', label: 'Company Name', placeholder: 'Company' },
  { id: 'deliveryContact', label: 'Delivery Contact', placeholder: 'Contact person' },
  { id: 'address', label: 'Address', placeholder: 'Street address' },
  { id: 'city', label: 'City', placeholder: 'City' },
  { id: 'postalCode', label: 'Postal Code', placeholder: 'Postal code' },
  { id: 'country', label: 'Country', placeholder: 'Country' },
]

/**
 * The two-level issue picker behind the RMA Action Determinator. Pick a
 * category in column one, then the specific issue in column two.
 */
export const ISSUE_CATEGORIES: IssueCategory[] = [
  {
    id: 'audio',
    label: 'Audio',
    issues: ['Audio control issue', 'No audio out', 'No Mic', 'Noise'],
  },
  {
    id: 'booting',
    label: 'Booting',
    issues: [
      'Blue screen',
      'Booting',
      'Cannot get into setup',
      'Locks up',
      'Reboots',
      'Stuck in bootloader',
      'Stuck in Isys screen',
    ],
  },
  {
    id: 'charging',
    label: 'Charging',
    issues: [
      'Charging issue battery',
      'Charging issue docking station',
      'Draining battery',
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    issues: [
      'Communication Cresnet',
      'Communication Digital I/O',
      'Communication Ethernet',
      'Communication IR',
      'Communication RF',
      'Communication Serially/RS-232',
      'Communication USB',
    ],
  },
  {
    id: 'firmware',
    label: 'Firmware/Software',
    issues: [
      'Upgrading/downloading customer programs',
      'Upgrading/downloading Firmware /PUF file',
    ],
  },
  {
    id: 'functionality',
    label: 'Functionality',
    issues: [
      'Humidity settings',
      'Keypad/button function',
      'Light flickering',
      'Load control',
      'No or weak FM/AM/Xm signal',
      'Relays not working',
      'Sensor reading',
      'Temperature settings',
    ],
  },
  {
    id: 'power',
    label: 'Power',
    issues: [
      'No backlight',
      'No display',
      'No power at all',
      'Power light on but no display, no activity',
      'Power surge/Lightning',
      'Shuts down',
    ],
  },
  {
    id: 'touchScreen',
    label: 'Touch screen',
    issues: ['Cannot calibrate / loses calibration', 'Unresponsive'],
  },
  {
    id: 'video',
    label: 'Video',
    issues: [
      'Blank / Black screen',
      'Composite',
      'Distorted',
      'DVI',
      'Flickers',
      'HDMI component',
      'RGB / Components video',
      'S-Video issues',
      'Video sync / colors dropping',
      'White screen',
    ],
  },
]
