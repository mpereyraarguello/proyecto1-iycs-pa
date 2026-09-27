import axios from "axios";
import axiosConfig from "../../../../utils/axiosConfig";

import { createCrudService } from "../../../../utils/crudFactory";
import { FormValues } from "../interfaces/interfaces-validaciones-item-prod-alternativo";
import ApiService from "../../../../utils/apiService";


const apiUrl = axiosConfig.apiUrl;

const baseService = createCrudService<FormValues>("producto");

const ProductoService = {
  ...baseService,

  
  obtenerMobile: async (filtros: any) => {
    try {
      const token = localStorage.getItem("Token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const { data } = await axios.get(`${apiUrl}/producto/search-by-mobile`, { headers, params: filtros });

      return data;
    } catch (error) {
      throw error;
    }
  },

  actualizarPreciosProducto: async (id: number, payload: any) => {
    try {
      const token = localStorage.getItem("Token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      console.log(">> PATCH iniciado a:", `${apiUrl}/producto/${id}/precios`);
      console.log(">> Payload PATCH:", payload);

      const result = await axios.patch(`${apiUrl}/producto/${id}/precios`, payload, { headers });
      console.log(">> PATCH terminado con éxito:", result);
      return result;
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      throw error;
    }
  },

  calcularPreciosConPorcentaje: async (
    productoId: number,
    baseImponible: number,
    porcentajeOcasional: number,
    porcentajeMayorista: number,
    porcentajeCliente: number,
  ) => {
    try {
      const token = localStorage.getItem("Token");
      const headers = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };

      const body = {
        productoId,
        baseImponible,
        porcentajeOcasional,
        porcentajeMayorista,
        porcentajeCliente,
      };

      const { data } = await axios.post(`${apiUrl}/producto/calcular-precio-item`, body, { headers });

      console.log("Respuesta de la API en calcular importes:", data);
      return data;
    } catch (error) {
      console.error("Error al calcular precios:", error);
      return null;
    }
  },

  calcularPreciosEnCrearProducto: async (
    alicuotaIva: number,
    baseImponible: number,
    porcentajeOcasional: number,
    porcentajeMayorista: number,
    porcentajeCliente: number,
  ) => {
    try {
      const token = localStorage.getItem("Token");
      const headers = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };

      const body = {
        alicuotaIva,
        baseImponible,
        porcentajeOcasional,
        porcentajeMayorista,
        porcentajeCliente,
      };

      const { data } = await axios.post(`${apiUrl}/producto/calcular-precio-item-from-nuevo`, body, { headers });

      console.log("Respuesta de la API en calcular importes:", data);
      return data;
    } catch (error) {
      console.error("Error al calcular precios:", error);
      return null;
    }
  },

  calcularPrecioConFlete: async (
    precio: number,
    tipo: number,
    valor: number,
  ): Promise<{ precioConFlete: number }> => {
    const token = localStorage.getItem("Token");
    const headers = {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    };
    const { data } = await axios.post(
      `${apiUrl}/producto/calcular-precio-con-flete`,
      { precio, tipo, valor },
      { headers },
    );
    return data;
  },

  generarDenominacion: async (payload: { lineaId?: number; marcaId?: number; presentacionId?: number }) => {
    try {
      const token = localStorage.getItem("Token");
      const headers = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };

      const { data } = await axios.post(`${apiUrl}/producto/denominacion-automatica`, payload, { headers });
      return data; // Se asume que retorna { denominacion: "..." } o un string direct
    } catch (error) {
      console.error("Error al generar denominación:", error);
      throw error;
    }
  },

  calcularPrecio: async (payload: {costo: number, margen: number}) => {
    try{
      const token = localStorage.getItem("Token");
      const headers = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };

      const response = await axios.post(`${apiUrl}/producto/calcular-precio`, 
        payload,
        { headers }
      );
      console.log('calcule el precio')
      return response.data;
    }catch (error) {
      console.error("Error al calcular precio:", error);
      throw error;
    }
    
  },


  registrarHistorialPrecio: async (
    productoId: number,
    payload: {
      costo: number;
      margen: number;
      precio: number;
      motivo: string;
      usuarioId: number;
    }
  ) => {
    try {
      const token = localStorage.getItem("Token");
      const headers = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };

      const { data } = await axios.post(
        `${apiUrl}/producto/${productoId}/historial-precio`,
        payload,
        { headers }
      );

      return data;
    } catch (error) {
      console.error("Error al registrar historial de precio:", error);
      throw error;
    }
  },
};

export default ProductoService;
