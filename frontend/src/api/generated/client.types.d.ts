
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
}
export type WakeResponse = {
  /**
   * Froude number Fr = v / sqrt(g L)
   */
  froude_number: number;
  /**
   * Kelvin wake half-angle in degrees (arcsin(1/3))
   */
  kelvin_angle_deg: number;
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
}
export type ValidationError = { loc: Array<(string | number)>, msg: string, type: string }
export type HTTPValidationError = Partial<{ detail: Array<ValidationError> }>

    // </Schemas>
    }
  
  export namespace Endpoints {
  // <Endpoints>
  
  /**
 * Computes Froude number and Kelvin wake boundary coordinates for a duck body length and swimming speed. The Kelvin half-angle is fixed at arcsin(1/3) in this simplified model.
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

  // </Endpoints>
  }
  
  
     // <EndpointByMethod>
     export type EndpointByMethod = {
     post: {
           "/api/wake": Endpoints.post_ComputeWake
         }
     }
     
     // </EndpointByMethod>
     

    // <EndpointByMethod.Shorthands>
    export type PostEndpoints = EndpointByMethod["post"]
    // </EndpointByMethod.Shorthands>
    