
  export namespace Schemas {
    // <Schemas>
  export type Point2D = {
  /**
   * X coordinate in meters
   */
  x_m: number;
  /**
   * Y coordinate in meters
   */
  y_m: number;
}
export type WakeRequest = {
  /**
   * Duck body length in meters
   */
  duck_length_m: number;
  /**
   * Swimming speed in meters per second
   */
  swimming_speed_m_s: number;
  /**
   * Physics model. "kelvin" is the classical fixed envelope (default); "advanced" adds a simplified Froude-dependent apparent wake.
   */
  physics_mode?: ("kelvin" | "advanced");
}
export type WakeResponse = {
  /**
   * Physics mode that produced this response
   */
  physics_mode: ("kelvin" | "advanced");
  /**
   * Froude number Fr = v / sqrt(g L)
   */
  froude_number: number;
  /**
   * Kelvin envelope half-angle in degrees (arcsin(1/3)); fixed
   */
  kelvin_angle_deg: number;
  /**
   * Apparent (dominant visible) wake half-angle in degrees. Equals kelvin_angle_deg in kelvin mode; never exceeds it.
   */
  apparent_angle_deg: number;
  /**
   * Sampled wake extent behind the duck in meters
   */
  wake_length_m: number;
  /**
   * Port-side Kelvin envelope arm (physics coordinates)
   */
  port_boundary: Array<Point2D>;
  /**
   * Starboard-side Kelvin envelope arm (physics coordinates)
   */
  starboard_boundary: Array<Point2D>;
  /**
   * Port-side apparent wake arm (equals the envelope in kelvin mode)
   */
  apparent_port_boundary: Array<Point2D>;
  /**
   * Starboard-side apparent wake arm (equals the envelope in kelvin mode)
   */
  apparent_starboard_boundary: Array<Point2D>;
}
export type WaveFieldRequest = {
  /**
   * Duck body length in meters
   */
  duck_length_m: number;
  /**
   * Swimming speed in meters per second
   */
  swimming_speed_m_s: number;
}
export type WaveFieldResponse = {
  duck_length_m: number;
  swimming_speed_m_s: number;
  froude_number: number;
  /**
   * Kelvin envelope half-angle in degrees; fixed reference
   */
  kelvin_angle_deg: number;
  wake_length_m: number;
  /**
   * Illustrative transverse wavelength rule L * (1 + 2 Fr)
   */
  transverse_wavelength_m: number;
  /**
   * Illustrative divergent wavelength (fraction of transverse)
   */
  divergent_wavelength_m: number;
  nx: number;
  ny: number;
  /**
   * Grid x coordinates (m), -wake_length to 0
   */
  x_m: Array<number>;
  /**
   * Grid y coordinates (m), symmetric about 0
   */
  y_m: Array<number>;
  /**
   * Transverse displacement, [ny][nx], arbitrary units
   */
  transverse: Array<Array<number>>;
  /**
   * Divergent displacement, [ny][nx], arbitrary units
   */
  divergent: Array<Array<number>>;
  /**
   * Transverse plus divergent displacement, [ny][nx]
   */
  combined: Array<Array<number>>;
}
export type ChatHistoryMessage = { role: ("user" | "assistant"), content: string }
export type DuckExplainContext = {
  /**
   * Educational duck species preset selected in the UI
   */
  species: ("teal" | "mallard" | "muscovy");
  /**
   * Duck body length in meters
   */
  duck_length_m: number;
  /**
   * Swimming speed in meters per second
   */
  swimming_speed_m_s: number;
  /**
   * Physics model selected in the UI. "kelvin" is the classical fixed envelope; "advanced" adds a simplified Froude-dependent apparent wake.
   */
  physics_mode?: ("kelvin" | "advanced");
}
export type DuckExplainRequest = {
  /**
   * User's physics question for the speaking duck
   */
  question: string;
  context: DuckExplainContext;
  /**
   * Prior user/assistant turns for multi-turn context. System instructions are never accepted from the client. Omitted or empty means a new conversation.
   */
  history?: Array<ChatHistoryMessage>;
}
export type DuckExplainResponse = {
  /**
   * Plain-text answer from the speaking duck
   */
  answer: string;
}
export type ValidationError = { loc: Array<(string | number)>, msg: string, type: string }
export type HTTPValidationError = Partial<{ detail: Array<ValidationError> }>

    // </Schemas>
    }
  
  export namespace Endpoints {
  // <Endpoints>
  
  /**
 * Computes Froude number and wake boundary coordinates for a duck body length and swimming speed. The Kelvin envelope half-angle is fixed at arcsin(1/3) in every mode. In "advanced" mode an additional, narrower apparent wake is returned using the simplified educational approximation min(theta_kelvin, atan(0.5 / Fr)); this is not a universally valid hydrodynamic law. All angles are half-angles in degrees; all coordinates are in meters.
 */
export type post_ComputeWake = {
      method: "POST",
      path: "/api/wake",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            
        
        
        
        body:  Schemas.WakeRequest,
          }
      responses: {200: Schemas.WakeResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Returns a deterministic, gridded water-surface displacement field behind the duck for two wave families (transverse and divergent) and their sum (combined). This is an illustrative interference model, not a fluid simulation, not a physically derived Kelvin wake solution, and not a physically exact duck wake. Displacements are arbitrary, dimensionless units. Grid values are [ny][nx] (row = y index, column = x index); coordinates are in meters. The field depends only on duck length and swimming speed.
 */
export type post_ComputeWaveField = {
      method: "POST",
      path: "/api/wave-field",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            
        
        
        
        body:  Schemas.WaveFieldRequest,
          }
      responses: {200: Schemas.WaveFieldResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Answers a physics question in the voice of the swimming duck, using the current simulation parameters. Derived quantities (Froude number, Kelvin and apparent angles, illustrative wavelengths) are computed on the server from the request context. Conversation history may include only user and assistant turns; the system instruction is server-owned. Requires OPENAI_API_KEY in the process environment for live answers.
 */
export type post_ExplainDuckPhysics = {
      method: "POST",
      path: "/api/duck/explain",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            
        
        
        
        body:  Schemas.DuckExplainRequest,
          }
      responses: {200: Schemas.DuckExplainResponse,
422: Schemas.HTTPValidationError,
},
      
    }

  // </Endpoints>
  }
  
  
     // <EndpointByMethod>
     export type EndpointByMethod = {
     post: {
           "/api/wake": Endpoints.post_ComputeWake,
"/api/wave-field": Endpoints.post_ComputeWaveField,
"/api/duck/explain": Endpoints.post_ExplainDuckPhysics
         }
     }
     
     // </EndpointByMethod>
     

    // <EndpointByMethod.Shorthands>
    export type PostEndpoints = EndpointByMethod["post"]
    // </EndpointByMethod.Shorthands>
    