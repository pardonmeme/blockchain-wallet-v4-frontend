import { merge, mergeRight, path, pathOr, prop } from 'ramda'
import axios, { AxiosRequestConfig } from 'axios'
import queryString from 'query-string'

axios.defaults.withCredentials = false
axios.defaults.timeout = Infinity

interface RequestConfig extends AxiosRequestConfig {
  contentType?: string
  endPoint?: string
  ignoreQueryParams?: boolean
  sessionToken?: string
  url?: string
}

type Header = {
  Authorization?: string
  ['Content-Type']: string
}

export type HTTPService = {
  get: <T>(options: Partial<RequestConfig>) => Promise<T>
  patch: <T>(options: Partial<RequestConfig>) => Promise<T>
  post: <T>(options: Partial<RequestConfig>) => Promise<T>
  put: <T>(options: Partial<RequestConfig>) => Promise<T>
}

export default ({ apiKey }: { apiKey: string }): HTTPService => {
  const encodeData = (data: any, contentType: string) => {
    const defaultData = {
      api_code: apiKey,
      ct: Date.now()
    }

    if (contentType === 'application/x-www-form-urlencoded') {
      return queryString.stringify(merge(defaultData, data))
    }
    return merge(defaultData, data)
  }

  const getHeaders = (contentType: string, sessionToken?: string) => {
    const headers: Header = {
      'Content-Type': contentType
    }
    if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`

    return headers
  }

  const request = <T>({
    cancelToken,
    contentType = 'application/x-www-form-urlencoded',
    data,
    endPoint,
    headers,
    method,
    sessionToken,
    url,
    ...options
  }: RequestConfig): Promise<T> =>
    axios
      .request<T>({
        url: `${url}${endPoint}`,
        method,
        data: encodeData(data, contentType),
        headers: mergeRight(getHeaders(contentType, sessionToken), headers),
        cancelToken,
        ...options
      })
      .catch(error => {
        const errorData = pathOr({}, ['response', 'data'], error)
        const status = path(['response', 'status'], error)
        if (typeof errorData === 'string') throw errorData
        throw merge(errorData, { status })
      })
      .then(prop('data'))

  const get = <T>({
    ignoreQueryParams,
    endPoint,
    data,
    ...options
  }: Partial<RequestConfig>) =>
    request<T>({
      ...options,
      method: 'GET',
      endPoint: ignoreQueryParams
        ? endPoint
        : `${endPoint}?${encodeData(data, 'application/x-www-form-urlencoded')}`
    })
  const post = <T>(options: Partial<RequestConfig>) =>
    request<T>({ method: 'POST', ...options })
  const put = <T>(options: Partial<RequestConfig>) =>
    request<T>({ method: 'PUT', ...options })
  const patch = <T>(options: Partial<RequestConfig>) =>
    request<T>({ method: 'PATCH', ...options })

  return {
    get,
    post,
    put,
    patch
  }
}
