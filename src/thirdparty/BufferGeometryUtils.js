/*
 * @author mrdoob / http://mrdoob.com/
 */

import * as THREE from 'three'

const BufferGeometryUtils = {

  computeTangents(geometry) {
    const index = geometry.index
    const attributes = geometry.attributes

    // based on http://www.terathon.com/code/tangent.html
    // (per vertex tangents)

    if (index === null
       || attributes.position === undefined
       || attributes.normal === undefined
       || attributes.uv === undefined) {
      console.warn('THREE.BufferGeometry: Missing required attributes (index, position, normal or uv) in BufferGeometry.computeTangents()')
      return
    }

    const indices = index.array
    const positions = attributes.position.array
    const normals = attributes.normal.array
    const uvs = attributes.uv.array

    const nVertices = positions.length / 3

    if (attributes.tangent === undefined) {
      geometry.addAttribute('tangent', new THREE.BufferAttribute(new Float32Array(4 * nVertices), 4))
    }

    const tangents = attributes.tangent.array

    const tan1 = []; const
      tan2 = []

    for (var i = 0; i < nVertices; i++) {
      tan1[i] = new THREE.Vector3()
      tan2[i] = new THREE.Vector3()
    }

    const vA = new THREE.Vector3()


    const vB = new THREE.Vector3()


    const vC = new THREE.Vector3()


    const uvA = new THREE.Vector2()


    const uvB = new THREE.Vector2()


    const uvC = new THREE.Vector2()


    const sdir = new THREE.Vector3()


    const tdir = new THREE.Vector3()

    function handleTriangle(a, b, c) {
      vA.fromArray(positions, a * 3)
      vB.fromArray(positions, b * 3)
      vC.fromArray(positions, c * 3)

      uvA.fromArray(uvs, a * 2)
      uvB.fromArray(uvs, b * 2)
      uvC.fromArray(uvs, c * 2)

      const x1 = vB.x - vA.x
      const x2 = vC.x - vA.x

      const y1 = vB.y - vA.y
      const y2 = vC.y - vA.y

      const z1 = vB.z - vA.z
      const z2 = vC.z - vA.z

      const s1 = uvB.x - uvA.x
      const s2 = uvC.x - uvA.x

      const t1 = uvB.y - uvA.y
      const t2 = uvC.y - uvA.y

      const r = 1.0 / (s1 * t2 - s2 * t1)

      sdir.set(
        (t2 * x1 - t1 * x2) * r,
        (t2 * y1 - t1 * y2) * r,
        (t2 * z1 - t1 * z2) * r,
      )

      tdir.set(
        (s1 * x2 - s2 * x1) * r,
        (s1 * y2 - s2 * y1) * r,
        (s1 * z2 - s2 * z1) * r,
      )

      tan1[a].add(sdir)
      tan1[b].add(sdir)
      tan1[c].add(sdir)

      tan2[a].add(tdir)
      tan2[b].add(tdir)
      tan2[c].add(tdir)
    }

    let groups = geometry.groups

    if (groups.length === 0) {
      groups = [{
        start: 0,
        count: indices.length,
      }]
    }

    for (var i = 0, il = groups.length; i < il; ++i) {
      var group = groups[i]

      var start = group.start
      var count = group.count

      for (var j = start, jl = start + count; j < jl; j += 3) {
        handleTriangle(
          indices[j + 0],
          indices[j + 1],
          indices[j + 2],
        )
      }
    }

    const tmp = new THREE.Vector3(); const
      tmp2 = new THREE.Vector3()
    const n = new THREE.Vector3(); const
      n2 = new THREE.Vector3()
    let w; let t; let
      test

    function handleVertex(v) {
      n.fromArray(normals, v * 3)
      n2.copy(n)

      t = tan1[v]

      // Gram-Schmidt orthogonalize

      tmp.copy(t)
      tmp.sub(n.multiplyScalar(n.dot(t))).normalize()

      // Calculate handedness

      tmp2.crossVectors(n2, t)
      test = tmp2.dot(tan2[v])
      w = (test < 0.0) ? -1.0 : 1.0

      tangents[v * 4] = tmp.x
      tangents[v * 4 + 1] = tmp.y
      tangents[v * 4 + 2] = tmp.z
      tangents[v * 4 + 3] = w
    }

    for (var i = 0, il = groups.length; i < il; ++i) {
      var group = groups[i]

      var start = group.start
      var count = group.count

      for (var j = start, jl = start + count; j < jl; j += 3) {
        handleVertex(indices[j + 0])
        handleVertex(indices[j + 1])
        handleVertex(indices[j + 2])
      }
    }
  },

  /**
   * @param  {Array<THREE.BufferGeometry>} geometries
   * @return {THREE.BufferGeometry}
   */
  mergeBufferGeometries(geometries, useGroups) {
    const isIndexed = geometries[0].index !== null

    const attributesUsed = new Set(Object.keys(geometries[0].attributes))
    const morphAttributesUsed = new Set(Object.keys(geometries[0].morphAttributes))

    const attributes = {}
    const morphAttributes = {}

    const mergedGeometry = new THREE.BufferGeometry()

    let offset = 0

    for (var i = 0; i < geometries.length; ++i) {
      const geometry = geometries[i]

      // ensure that all geometries are indexed, or none

      if (isIndexed !== (geometry.index !== null)) return null

      // gather attributes, exit early if they're different

      for (var name in geometry.attributes) {
        if (!attributesUsed.has(name)) return null

        if (attributes[name] === undefined) attributes[name] = []

        attributes[name].push(geometry.attributes[name])
      }

      // gather morph attributes, exit early if they're different

      for (var name in geometry.morphAttributes) {
        if (!morphAttributesUsed.has(name)) return null

        if (morphAttributes[name] === undefined) morphAttributes[name] = []

        morphAttributes[name].push(geometry.morphAttributes[name])
      }

      // gather .userData

      mergedGeometry.userData.mergedUserData = mergedGeometry.userData.mergedUserData || []
      mergedGeometry.userData.mergedUserData.push(geometry.userData)

      if (useGroups) {
        var count

        if (isIndexed) {
          count = geometry.index.count
        } else if (geometry.attributes.position !== undefined) {
          count = geometry.attributes.position.count
        } else {
          return null
        }

        mergedGeometry.addGroup(offset, count, i)

        offset += count
      }
    }

    // merge indices

    if (isIndexed) {
      let indexOffset = 0
      const mergedIndex = []

      for (var i = 0; i < geometries.length; ++i) {
        const index = geometries[i].index

        for (var j = 0; j < index.count; ++j) {
          mergedIndex.push(index.getX(j) + indexOffset)
        }

        indexOffset += geometries[i].attributes.position.count
      }

      mergedGeometry.setIndex(mergedIndex)
    }

    // merge attributes

    for (var name in attributes) {
      const mergedAttribute = this.mergeBufferAttributes(attributes[name])

      if (!mergedAttribute) return null

      mergedGeometry.addAttribute(name, mergedAttribute)
    }

    // merge morph attributes

    for (var name in morphAttributes) {
      const numMorphTargets = morphAttributes[name][0].length

      if (numMorphTargets === 0) break

      mergedGeometry.morphAttributes = mergedGeometry.morphAttributes || {}
      mergedGeometry.morphAttributes[name] = []

      for (var i = 0; i < numMorphTargets; ++i) {
        const morphAttributesToMerge = []

        for (var j = 0; j < morphAttributes[name].length; ++j) {
          morphAttributesToMerge.push(morphAttributes[name][j][i])
        }

        const mergedMorphAttribute = this.mergeBufferAttributes(morphAttributesToMerge)

        if (!mergedMorphAttribute) return null

        mergedGeometry.morphAttributes[name].push(mergedMorphAttribute)
      }
    }

    return mergedGeometry
  },

  /**
   * @param {Array<THREE.BufferAttribute>} attributes
   * @return {THREE.BufferAttribute}
   */
  mergeBufferAttributes(attributes) {
    let TypedArray
    let itemSize
    let normalized
    let arrayLength = 0

    for (var i = 0; i < attributes.length; ++i) {
      const attribute = attributes[i]

      if (attribute.isInterleavedBufferAttribute) return null

      if (TypedArray === undefined) TypedArray = attribute.array.constructor
      if (TypedArray !== attribute.array.constructor) return null

      if (itemSize === undefined) itemSize = attribute.itemSize
      if (itemSize !== attribute.itemSize) return null

      if (normalized === undefined) normalized = attribute.normalized
      if (normalized !== attribute.normalized) return null

      arrayLength += attribute.array.length
    }

    const array = new TypedArray(arrayLength)
    let offset = 0

    for (var i = 0; i < attributes.length; ++i) {
      array.set(attributes[i].array, offset)

      offset += attributes[i].array.length
    }

    return new THREE.BufferAttribute(array, itemSize, normalized)
  },

}


export default BufferGeometryUtils
