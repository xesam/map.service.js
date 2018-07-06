var StopSearcher = (function () {
    function check_response(...items) {
        return items.length >= 2 && items[0] === 'complete' && items[1].info === 'OK';
    }

    function to_location(latlng) {
        return [latlng.getLng(), latlng.getLat()];
    }

    function get_attrs(src, ...attr_names) {
        return attr_names.reduce((total, curr) => {
            total[curr] = src[curr];
            return total;
        }, {});
    }

    function to_station(station_infos) {
        return station_infos.map((station_info) => {
            return {
                ...get_attrs(station_info,
                    'id',
                    'name',
                    'type',
                    'citycode',
                    'adcode'
                ),
                default_location: to_location(station_info.location),
                lines: station_info.buslines.map(line => {
                    return {
                        ...get_attrs(line, 'id', 'name', 'start_stop', 'end_stop'),
                        location: to_location(line.location)
                    }
                }),
            };
        });
    }

    const MAX_PAGE_SIZE = 48;//高德的接口文档说明有错误，这里用来判断是否翻页完毕

    function page_search_by_name(searcher, name, page_index, page_size, total_items, resolve, reject) {
        searcher.setPageIndex(page_index);
        searcher.setPageSize(page_size);
        searcher.search(name, function (status, result) {
            if (check_response(status, result)) {
                let infos = result.stationInfo;
                let search_lines = to_station(infos);
                if (search_lines.length < page_size) {
                    total_items = total_items.concat(search_lines);
                    resolve(total_items);
                } else {
                    if (total_items.length > 0 && search_lines[0].id === total_items[0].id) {
                        resolve(total_items);
                    } else {
                        total_items = total_items.concat(search_lines);
                        page_search_by_name(searcher, name, page_index + 1, page_size, total_items, resolve, reject);
                    }
                }
            } else {
                console.error(`error:${name}, ${page_index}, ${page_size}`, status);
                reject(status);
            }
        });
    }


    return {
        init(city_name) {
            this.searcher = new AMap.StationSearch({
                city: city_name
            });
            return this;
        },
        search_by_id(id) {
            return new Promise((resolve, reject) => {
                this.searcher.searchById(id, function (status, result) {
                    if (check_response(status, result)) {
                        console.log(result);
                        let infos = result.stationInfo;
                        let items = to_station(infos);
                        resolve(items);
                    } else {
                        console.error(status);
                        reject(status);
                    }
                });
            });
        },
        search_by_name(name) {
            return new Promise((resolve, reject) => {
                page_search_by_name(this.searcher, name, 1, MAX_PAGE_SIZE, [], resolve, reject);
            });
        }
    };
})();