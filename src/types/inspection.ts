// Types for inspection-related data
import type {
  Inspection,
  Property,
  Section,
  SectionTemplate,
  Observation,
  Media,
  User,
  InspectionStatus,
  ObservationStatus,
  ObservationSeverity,
  Urgency,
} from '@prisma/client'

export type InspectionWithProperty = Inspection & {
  property: Property
  inspector: Pick<User, 'id' | 'first_name' | 'last_name'> | null
  sections: SectionWithObservations[]
}

export type SectionWithObservations = Section & {
  template: SectionTemplate
  observations: ObservationWithMedia[]
}

export type ObservationWithMedia = Observation & {
  media: Media[]
}

export type InspectionListItem = {
  id: string
  status: InspectionStatus
  scheduled_date: Date | string
  started_at: Date | string | null
  property: {
    id: string
    address_line1: string
    address_line2: string | null
    city: string
    state: string
    zip_code: string
  }
  sections: {
    id: string
    is_complete: boolean
    is_not_applicable: boolean
    observations: { id: string }[]
  }[]
}

export type SectionProgress = {
  total: number
  complete: number
  notApplicable: number
  observationCount: number
}

export { InspectionStatus, ObservationStatus, ObservationSeverity, Urgency }
